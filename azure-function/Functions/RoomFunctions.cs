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
            var user = roomMgr.GetUserById(userId);
            await ToUser(user, eventType, args);
        }

        private async Task ToUser(ActiveUser user, ClientEvent eventType, params object[] args)
        {
            if (user != null && user.RoomId != null)
                await Clients.User(user.Id).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToRoom(string roomId, ClientEvent eventType, params object[] args)
        {
            if (roomId != null)
                await Clients.Group(roomId).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToPeers(string userId, string connectionId, ClientEvent eventType, params object[] args)
        {
            var user = roomMgr.GetUserById(userId);
            await ToPeers(user, connectionId, eventType, args);
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

                if (user != null && user.RoomId != null)
                {
                    log.LogInformation($"{userId} exiting room {user.RoomId}");
                    await ToPeers(userId, connectionId, ClientEvent.peerLeftRoom, user);
                    log.LogInformation($"told peers that {userId} exited room {user.RoomId}");
                    await Groups.RemoveFromGroupAsync(userId, user.RoomId);
                    log.LogInformation($"removed {userId} from group {user.RoomId}");
                    roomMgr.UserLeaveRoom(userId);
                }
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
                await ToPeers(context.UserId, context.ConnectionId, ClientEvent.peerChangedName, user);
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
        public async Task<bool> JoinRoom([SignalRTrigger] InvocationContext context, string roomId)
        {
            log.LogDebug($"{nameof(JoinRoom)}: {context.UserId}");

            await ExitRoom(context.UserId, context.ConnectionId);

            if (string.IsNullOrWhiteSpace(roomId)) return false;

            var room = roomMgr.GetRoom(roomId);
            var usersInRoom = roomMgr.GetUsersInRoom(roomId);
            var user = roomMgr.UserJoinRoom(context.UserId, roomId);

            if (user == null) return false;

            await Groups.AddToGroupAsync(context.ConnectionId, roomId);
            await ToUser(context.UserId, ClientEvent.joinedRoom, room);
            await ToUser(context.UserId, ClientEvent.initialPeers, user, usersInRoom);
            await ToPeers(user, context.ConnectionId, ClientEvent.peerJoinedRoom, user);
            return true;
        }

        [FunctionName(nameof(JoinCall))]
        public async Task JoinCall([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(JoinCall)}: {context.UserId}");

            var user = roomMgr.UserJoinCall(context.UserId);
            if (user != null && user.RoomId != null)
                await ToPeers(user, context.ConnectionId, ClientEvent.peerJoiningCall, user);
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
                await ToPeers(user, context.ConnectionId, ClientEvent.peerLeftCall, user);
                roomMgr.UserLeaveCall(context.UserId);
            }
        }

        [FunctionName(nameof(Offer))]
        public async Task Offer([SignalRTrigger] InvocationContext context, string peerId,  RTCSessionDescriptionInit offer)
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
            loggedIn,
            createdRoom,
            joinedRoom,
            initialPeers,
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
