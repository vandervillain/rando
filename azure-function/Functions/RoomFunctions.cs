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

        private async Task ToClient(string connId, ClientEvent eventType, params object[] args)
        {
            var user = roomMgr.GetUserByConnId(connId);
            if (user != null && user.RoomId != null)
                await Clients.Client(connId).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToRoom(string roomId, ClientEvent eventType, params object[] args)
        {
            if (roomId != null)
                await Clients.Group(roomId).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToPeers(string connId, ClientEvent eventType, params object[] args)
        {
            var user = roomMgr.GetUserByConnId(connId);
            await ToPeers(user, eventType, args);
        }

        private async Task ToPeers(ActiveUser user, ClientEvent eventType, params object[] args)
        {
            if (user != null && user.RoomId != null)
                await Clients.GroupExcept(user.RoomId, new string[] { user.SocketId }).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ExitRoom(string connId)
        {
            try
            {
                var user = roomMgr.GetUserByConnId(connId);

                if (user != null && user.RoomId != null)
                {
                    log.LogInformation($"{connId} exiting room {user.RoomId}");
                    await ToPeers(connId, ClientEvent.peerLeftRoom, user);
                    log.LogInformation($"told peers that {connId} exited room {user.RoomId}");
                    await Groups.RemoveFromGroupAsync(connId, user.RoomId);
                    log.LogInformation($"removed {connId} from group {user.RoomId}");
                    roomMgr.UserLeaveRoom(connId);
                }
            }
            catch (Exception e)
            {
                log.LogError(e.Message);
            }
            //await UserGroups.RemoveFromAllGroupsAsync(connId);
        }

        [FunctionName(nameof(Negotiate))]
        public SignalRConnectionInfo Negotiate([HttpTrigger(AuthorizationLevel.Anonymous)] HttpRequest req)
        {
            log.LogDebug($"{req.Method} {req.GetDisplayUrl()}");
            return Negotiate(req.Headers["x-ms-signalr-user-id"]);//, GetClaims(req.Headers["Authorization"]));
        }

        [FunctionName(nameof(OnConnected))]
        public void OnConnected([SignalRTrigger] InvocationContext context)
        {
            roomMgr.ReconnectOrAddUser(context.UserId, context.ConnectionId);
            log.LogInformation($"{context.UserId} connected as {context.ConnectionId}");
        }

        [FunctionName(nameof(OnReconnected))]
        public void OnReconnected([SignalRTrigger] InvocationContext context)
        {
            roomMgr.ReconnectOrAddUser(context.UserId, context.ConnectionId);
            log.LogInformation($"{context.UserId} reconnected as {context.ConnectionId}");
        }

        [FunctionName(nameof(OnDisconnected))]
        public void OnDisconnected([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(OnDisconnected)}: {context.ConnectionId}");

            ExitRoom(context.ConnectionId).GetAwaiter().GetResult();
            roomMgr.DisconnectUser(context.ConnectionId);
        }

        [FunctionName(nameof(SetUserName))]
        public async Task SetUserName([SignalRTrigger] InvocationContext context, string userName)
        {
            log.LogDebug($"{nameof(SetUserName)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userName))
            {
                var user = roomMgr.SetUserName(context.ConnectionId, userName);
                await ToPeers(context.ConnectionId, ClientEvent.peerChangedName, user);
            }
        }

        [FunctionName(nameof(CreateRoom))]
        public async Task<string> CreateRoom([SignalRTrigger] InvocationContext context, string roomName)
        {
            log.LogDebug($"{nameof(CreateRoom)}: {context.ConnectionId}");

            await ExitRoom(context.ConnectionId);

            if (!string.IsNullOrWhiteSpace(roomName))
            {
                var roomId = roomMgr.AddActiveRoom(context.ConnectionId, roomName);
                return roomId;
            }
            return null;
        }

        [FunctionName(nameof(JoinRoom))]
        public async Task JoinRoom([SignalRTrigger] InvocationContext context, string roomId)
        {
            log.LogDebug($"{nameof(JoinRoom)}: {context.ConnectionId}");

            await ExitRoom(context.ConnectionId);

            if (!string.IsNullOrWhiteSpace(roomId))
            {
                var room = roomMgr.GetRoom(roomId);
                var usersInRoom = roomMgr.GetUsersInRoom(roomId);
                var user = roomMgr.UserJoinRoom(context.ConnectionId, roomId);
                if (user != null)
                {
                    await Groups.AddToGroupAsync(context.ConnectionId, roomId);
                    await ToClient(context.ConnectionId, ClientEvent.joinedRoom, room);
                    await ToClient(context.ConnectionId, ClientEvent.initialPeers, user, usersInRoom);
                    await ToPeers(user, ClientEvent.peerJoinedRoom, user);
                }
            }
        }

        [FunctionName(nameof(JoinCall))]
        public async Task JoinCall([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(JoinCall)}: {context.ConnectionId}");

            var user = roomMgr.UserJoinCall(context.ConnectionId);
            if (user != null && user.RoomId != null)
            {
                // tell other clients in this room that user is joining call
                await ToPeers(user, ClientEvent.peerJoiningCall, user);
            }
        }

        [FunctionName(nameof(LeaveRoom))]
        public async Task LeaveRoom([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(LeaveRoom)}: {context.ConnectionId}");
            await ExitRoom(context.ConnectionId);
        }

        [FunctionName(nameof(LeaveCall))]
        public async Task LeaveCall([SignalRTrigger] InvocationContext context)
        {
            log.LogDebug($"{nameof(LeaveRoom)}: {context.ConnectionId}");
            var user = roomMgr.GetUserByConnId(context.ConnectionId);
            if (user != null && user.RoomId != null)
            {
                await ToPeers(context.ConnectionId, ClientEvent.peerLeftCall, user);
                roomMgr.UserLeaveCall(context.ConnectionId);
            }
        }

        [FunctionName(nameof(Offer))]
        public async Task Offer([SignalRTrigger] InvocationContext context, string userId, RTCSessionDescriptionInit offer)
        {
            log.LogDebug($"{nameof(Offer)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userId) && offer != null)
            {
                var user = roomMgr.GetUserByConnId(context.ConnectionId);
                var peer = roomMgr.GetUserById(userId);
                if (user == null) log.LogError($"user {user.Id} not found");
                else if (peer == null) log.LogError($"peer {user.Id} not found");
                else if (user.RoomId != peer.RoomId) log.LogError($"user is in room {user.RoomId} but peer is in room {peer.RoomId}");
                else
                {
                    log.LogInformation($"user {user.Id} sending an offer to peer {peer.Id}");
                    await ToClient(peer.SocketId, ClientEvent.offer, user.Id, offer);
                }
            }
        }

        [FunctionName(nameof(Answer))]
        public async Task Answer([SignalRTrigger] InvocationContext context, string userId, RTCSessionDescriptionInit answer)
        {
            log.LogDebug($"{nameof(Answer)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userId) && answer != null)
            {
                var user = roomMgr.GetUserByConnId(context.ConnectionId);
                var peer = roomMgr.GetUserById(userId);
                if (user == null) log.LogError($"user {user.Id} not found");
                else if (peer == null) log.LogError($"peer {user.Id} not found");
                else if (user.RoomId != peer.RoomId) log.LogError($"user is in room {user.RoomId} but peer is in room {peer.RoomId}");
                else
                {
                    log.LogInformation($"user {user.Id} sending an answer to peer {peer.Id}");
                    await ToClient(peer.SocketId, ClientEvent.answer, user.Id, answer);
                }
            }
        }

        [FunctionName(nameof(Candidate))]
        public async Task Candidate([SignalRTrigger] InvocationContext context, string userId, RTCIceCandidate candidate)
        {
            log.LogDebug($"{nameof(Candidate)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userId) && candidate != null)
            {
                var user = roomMgr.GetUserByConnId(context.ConnectionId);
                var peer = roomMgr.GetUserById(userId);
                if (user == null) log.LogError($"user {user.Id} not found");
                else if (peer == null) log.LogError($"peer {user.Id} not found");
                else if (user.RoomId != peer.RoomId) log.LogError($"user is in room {user.RoomId} but peer is in room {peer.RoomId}");
                else
                {
                    log.LogInformation($"user {user.Id} sending a candidate to peer {peer.Id}");
                    await ToClient(peer.SocketId, ClientEvent.candidate, user.Id, candidate);
                }
            }
        }

        public enum ClientEvent
        {
            loggedIn,
            createdRoom,
            joinedRoom,
            joinedRoomFailed,
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
