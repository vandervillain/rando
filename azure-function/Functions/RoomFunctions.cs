using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http.Extensions;
using azure_function.Data;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using System.Linq;

namespace azure_function.Functions
{
    public class RoomFunctions : ServerlessHub
    {
        private readonly RoomManager roomMgr;
        private readonly ILogger<RoomFunctions> log;

        public RoomFunctions(RoomManager mgr, ILogger<RoomFunctions> logger)
        {
            roomMgr = mgr;
            log = logger;
        }

        [FunctionName(nameof(Login))]
        public async Task<IActionResult> Login([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req,
        [SignalR(HubName = nameof(RoomFunctions))] IAsyncCollector<SignalRMessage> signalRMessages)
        {
            log.LogDebug($"{nameof(Login)}: {req.GetDisplayUrl()}");
            bool authorized = true;
            if (!authorized)
            {
                log.LogError("Unauthorized Request");
                return new UnauthorizedResult();
            }

            using (StreamReader streamReader = new StreamReader(req.Body))
            {
                string requestBody = await streamReader.ReadToEndAsync();
                ActiveUser user = await Task.Run(() => JsonConvert.DeserializeObject<ActiveUser>(requestBody));
                return new OkObjectResult(user);
            }
        }

        private async Task ToUser(string userId, ClientEvent eventType, params object[] args)
        {
            await ToUser(roomMgr.GetUserById(userId), eventType, args);
        }

        private async Task ToUser(ActiveUser user, ClientEvent eventType, params object[] args)
        {
            if (user != null && user.RoomId != null)
                await Clients.User(user.Id).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToRoom(string roomId, ClientEvent eventType, params object[] args)
        {
            await Clients.Group(roomId).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToPeers(string userId, string connectionId, ClientEvent eventType, params object[] args)
        {
            await ToPeers(roomMgr.GetUserById(userId), connectionId, eventType, args);
        }

        private async Task ToPeers(ActiveUser user, string connectionId, ClientEvent eventType, params object[] args)
        {
            if (user != null && user.RoomId != null)
                await Clients.GroupExcept(user.RoomId, new string[] { connectionId }).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ExitRoom(string userId, string connectionId)
        {
            try
            {
                var user = roomMgr.GetUserById(userId);

                if (user == null || user.RoomId == null) return;

                string roomId = user.RoomId;
                log.LogInformation($"{userId} exiting room {roomId}");

                try
                {
                    await Groups.RemoveFromGroupAsync(userId, roomId);
                }
                catch (Exception e)
                {
                    // doesn't matter, probably already removed by disconnect/refresh
                    _ = e.ToString();
                }

                roomMgr.UserLeaveRoom(userId);
                log.LogInformation($"removed {userId} from room {roomId}");

                // tell former peers that user left
                var usersInRoom = roomMgr.GetUsersInRoom(roomId);
                log.LogInformation($"telling peers {string.Join(',', usersInRoom.Select(u => u.Name))} that {userId} left room {roomId}");
                await ToRoom(roomId, ClientEvent.peerLeftRoom, user, usersInRoom);
            }
            catch (Exception e)
            {
                log.LogError(e.Message);
            }
        }

        [FunctionName(nameof(Negotiate))]
        public SignalRConnectionInfo Negotiate([HttpTrigger(AuthorizationLevel.Anonymous)] HttpRequest req)
        {
            log.LogDebug($"{req.Method} {req.GetDisplayUrl()}");
            return Negotiate(req.Headers["x-ms-signalr-user-id"]);
        }

        [FunctionName(nameof(OnConnected))]
        public void OnConnected([SignalRTrigger] InvocationContext context)
        {
            roomMgr.ReconnectOrAddUser(context.UserId);
        }

        [FunctionName(nameof(OnReconnected))]
        public void OnReconnected([SignalRTrigger] InvocationContext context)
        {
            roomMgr.ReconnectOrAddUser(context.UserId);
        }

        [FunctionName(nameof(OnDisconnected))]
        public void OnDisconnected([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(OnDisconnected)}: {context.ConnectionId}");

            ExitRoom(context.UserId, context.ConnectionId).GetAwaiter().GetResult();
            roomMgr.DisconnectUser(context.UserId);
        }

        [FunctionName(nameof(SetUserProfile))]
        public async Task SetUserProfile([SignalRTrigger] InvocationContext context, string userName, string avatar = null, string sound = null)
        {
            log.LogDebug($"{nameof(SetUserProfile)}: {context.UserId}");

            if (!string.IsNullOrWhiteSpace(userName))
            {
                var user = roomMgr.SetUserProfile(context.UserId, userName, avatar, sound);
                if (user.RoomId != null)
                    await ToRoom(user.RoomId, ClientEvent.peerChangedName, user);
            }
        }

        [FunctionName(nameof(CreateRoom))]
        public async Task<string> CreateRoom([SignalRTrigger] InvocationContext context, string roomName)
        {
            log.LogDebug($"{nameof(CreateRoom)}: {context.UserId}");

            await ExitRoom(context.UserId, context.ConnectionId);

            if (string.IsNullOrWhiteSpace(roomName)) return null;

            var roomId = roomMgr.AddActiveRoom(context.UserId, roomName);
            return roomId;
        }

        [FunctionName(nameof(JoinRoom))]
        public async Task<object> JoinRoom([SignalRTrigger] InvocationContext context, string roomId)
        {
            log.LogDebug($"{nameof(JoinRoom)}: {context.UserId}");

            await ExitRoom(context.UserId, context.ConnectionId);

            if (string.IsNullOrWhiteSpace(roomId)) return null;

            var room = roomMgr.GetRoom(roomId);
            log.LogDebug($"got room {roomId}");
            var user = roomMgr.UserJoinRoom(context.UserId, roomId);

            if (user == null) return null;

            var usersInRoom = roomMgr.GetUsersInRoom(roomId);
            log.LogInformation($"telling peers {string.Join(',', usersInRoom.Select(u => u.Name))} that {user.Id} joined room {roomId}");
            await Groups.AddToGroupAsync(context.ConnectionId, roomId);
            await ToPeers(user.Id, context.ConnectionId, ClientEvent.peerJoinedRoom, user, usersInRoom);
            return new
            {
                room = room,
                peers = usersInRoom
            };
        }

        [FunctionName(nameof(JoinCall))]
        public async Task JoinCall([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(JoinCall)}: {context.UserId}");

            var user = roomMgr.UserJoinCall(context.UserId);
            if (user != null && user.RoomId != null)
            {
                var usersInRoom = roomMgr.GetUsersInRoom(user.RoomId);
                await ToRoom(user.RoomId, ClientEvent.peerJoiningCall, user, usersInRoom);
            }
        }

        [FunctionName(nameof(LeaveRoom))]
        public async Task LeaveRoom([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(LeaveRoom)}: {context.UserId}");
            await ExitRoom(context.UserId, context.ConnectionId);
        }

        [FunctionName(nameof(LeaveCall))]
        public async Task LeaveCall([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(LeaveRoom)}: {context.UserId}");
            var user = roomMgr.GetUserById(context.UserId);
            if (user != null && user.RoomId != null)
            {
                roomMgr.UserLeaveCall(context.UserId);
                var usersInRoom = roomMgr.GetUsersInRoom(user.RoomId);
                await ToRoom(user.RoomId, ClientEvent.peerLeftCall, user, usersInRoom);
            }
        }

        [FunctionName(nameof(Offer))]
        public async Task Offer([SignalRTrigger] InvocationContext context, string peerId, RTCSessionDescriptionInit offer)
        {
            log.LogDebug($"{nameof(Offer)}: {context.UserId}");
            if (!string.IsNullOrWhiteSpace(peerId) && offer != null)
            {
                var user = roomMgr.GetUserById(context.UserId);
                var peer = roomMgr.GetUserById(peerId);
                if (user == null) log.LogError("user not found");
                else if (peer == null) log.LogError("peer not found");
                else if (user.RoomId != peer.RoomId) log.LogError($"user is in room {user.RoomId} but peer is in room {peer.RoomId}");
                else
                {
                    log.LogInformation($"user {user.Id} sending an offer to peer {peer.Id}");
                    await ToUser(peer.Id, ClientEvent.offer, user.Id, offer);
                }
            }
        }

        [FunctionName(nameof(Answer))]
        public async Task Answer([SignalRTrigger] InvocationContext context, string peerId, RTCSessionDescriptionInit answer)
        {
            log.LogDebug($"{nameof(Answer)}: {context.UserId}");
            if (!string.IsNullOrWhiteSpace(peerId) && answer != null)
            {
                var user = roomMgr.GetUserById(context.UserId);
                var peer = roomMgr.GetUserById(peerId);
                if (user == null) log.LogError("user not found");
                else if (peer == null) log.LogError("peer not found");
                else if (user.RoomId != peer.RoomId) log.LogError($"user is in room {user.RoomId} but peer is in room {peer.RoomId}");
                else
                {
                    log.LogInformation($"user {user.Id} sending an answer to peer {peer.Id}");
                    await ToUser(peer.Id, ClientEvent.answer, user.Id, answer);
                }
            }
        }

        [FunctionName(nameof(Candidate))]
        public async Task Candidate([SignalRTrigger] InvocationContext context, string peerId, RTCIceCandidate candidate)
        {
            log.LogDebug($"{nameof(Candidate)}: {context.UserId}");
            if (!string.IsNullOrWhiteSpace(peerId) && candidate != null)
            {
                var user = roomMgr.GetUserById(context.UserId);
                var peer = roomMgr.GetUserById(peerId);
                if (user == null) log.LogError("user not found");
                else if (peer == null) log.LogError("peer not found");
                else if (user.RoomId != peer.RoomId) log.LogError($"user is in room {user.RoomId} but peer is in room {peer.RoomId}");
                else
                {
                    log.LogInformation($"user {user.Id} sending a candidate to peer {peer.Id}");
                    await ToUser(peer.Id, ClientEvent.candidate, user.Id, candidate);
                }
            }
        }

        public enum ClientEvent
        {
            peerJoinedRoom,
            peerLeftRoom,
            peerJoiningCall,
            peerLeftCall,
            peerChangedName,
            // web rtc
            offer,
            answer,
            candidate
        }
    }
}
