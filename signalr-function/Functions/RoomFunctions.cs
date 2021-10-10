using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using signalr_function.Data;

namespace signalr_function.Functions
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

        private async Task ToClient(string connId, ClientEvent eventType, params object[] args)
        {
            var user = roomMgr.GetUserByConnId(connId);
            if (user != null && user.Room.Id != null)
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
            if (user != null && user.Room.Id != null)
                await Clients.GroupExcept(user.Room.Id, new string[] { user.SocketId }).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ExitRoom(string connId)
        {
            var user = roomMgr.GetUserByConnId(connId);
            if (user != null && user.Room != null)
            {
                log.LogInformation($"{connId} exiting room {user.Room.Id}");
                await ToPeers(connId, ClientEvent.peerLeftRoom, user);
                roomMgr.UserLeaveRoom(connId);
                await Groups.RemoveFromGroupAsync(connId, user.Room.Id);
            }
            //await UserGroups.RemoveFromAllGroupsAsync(connId);
        }

        [FunctionName(nameof(Negotiate))]
        public SignalRConnectionInfo Negotiate([HttpTrigger(AuthorizationLevel.Anonymous)] HttpRequest req)
        {
            log.LogInformation($"{req.Method} {req.GetDisplayUrl()}");
            return Negotiate(req.Headers["x-ms-signalr-user-id"]);//, GetClaims(req.Headers["Authorization"]));
        }

        [FunctionName(nameof(OnConnected))]
        public void OnConnected([SignalRTrigger] InvocationContext context)
        {
            roomMgr.AddActiveUser(context.ConnectionId, context.UserId);
            log.LogInformation($"{nameof(OnConnected)}: {context.ConnectionId} {context.UserId}");
        }

        [FunctionName(nameof(OnDisconnected))]
        public void OnDisconnected([SignalRTrigger] InvocationContext context)
        {
            log.LogInformation($"{nameof(OnDisconnected)}: {context.ConnectionId}");
            // TODO: don't remove immediately to allow reconnect? or if reconnecting does it not hit this?
            ExitRoom(context.ConnectionId).GetAwaiter().GetResult();
            roomMgr.RemoveActiveUser(context.ConnectionId);
        }

        [FunctionName(nameof(Login))]
        public ActiveUser Login([SignalRTrigger] InvocationContext context, string userName)
        {
            log.LogInformation($"{nameof(Login)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userName))
            {
                var user = roomMgr.SetUserName(context.ConnectionId, userName);
                return user;
            }
            return null;
        }

        [FunctionName(nameof(SetUserName))]
        public async Task SetUserName([SignalRTrigger] InvocationContext context, string userName)
        {
            log.LogInformation($"{nameof(SetUserName)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userName))
            {
                var user = roomMgr.SetUserName(context.ConnectionId, userName);
                await ToPeers(context.ConnectionId, ClientEvent.peerChangedName, user);
            }
        }

        [FunctionName(nameof(CreateRoom))]
        public async Task<string> CreateRoom([SignalRTrigger] InvocationContext context, string roomName)
        {
            log.LogInformation($"{nameof(CreateRoom)}: {context.ConnectionId}");

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
            log.LogInformation($"{nameof(JoinRoom)}: {context.ConnectionId}");

            await ExitRoom(context.ConnectionId);

            if (!string.IsNullOrWhiteSpace(roomId))
            {
                var usersInRoom = roomMgr.GetUsersInRoom(roomId);
                var user = roomMgr.UserJoinRoom(context.ConnectionId, roomId);
                if (user != null) 
                {
                    await Groups.AddToGroupAsync(context.ConnectionId, roomId);
                    await ToClient(context.ConnectionId, ClientEvent.joinedRoom, user, usersInRoom);
                    await ToPeers(user, ClientEvent.peerJoinedRoom, user);
                }
            }
        }

        [FunctionName(nameof(JoinCall))]
        public async Task JoinCall([SignalRTrigger] InvocationContext context)
        {
            log.LogInformation($"{nameof(JoinCall)}: {context.ConnectionId}");

            var user = roomMgr.UserJoinCall(context.ConnectionId);
            if (user != null && user.Room != null)
            {
                // tell other clients in this room that user is joining call
                await ToPeers(user, ClientEvent.peerJoiningCall, user);
            }
        }

        [FunctionName(nameof(LeaveRoom))]
        public async Task LeaveRoom([SignalRTrigger] InvocationContext context, string roomId)
        {
            log.LogInformation($"{nameof(LeaveRoom)}: {context.ConnectionId}");
            await ExitRoom(context.ConnectionId);
        }

        [FunctionName(nameof(Offer))]
        public async Task Offer([SignalRTrigger] InvocationContext context, string userId, RTCSessionDescriptionInit offer)
        {
            log.LogInformation($"{nameof(Offer)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userId) && offer != null)
            {
                var user = roomMgr.GetUserByConnId(context.ConnectionId);
                var peer = roomMgr.GetUserById(userId);
                if (user == null) log.LogError($"user {user.Id} not found");
                else if (peer == null) log.LogError($"peer {user.Id} not found");
                else if (user.Room?.Id != peer.Room?.Id) log.LogError($"user is in room {user.Room?.Id} but peer is in room {peer.Room?.Id}");
                else
                {
                    log.LogInformation($"user {user.Id} sending an offer to peer {peer.Id}");
                    await ToClient(peer.SocketId, ClientEvent.offer, user, offer);
                }
            }
        }

        [FunctionName(nameof(Answer))]
        public async Task Answer([SignalRTrigger] InvocationContext context, string userId, RTCSessionDescriptionInit answer)
        {
            log.LogInformation($"{nameof(Answer)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userId) && answer != null)
            {
                var user = roomMgr.GetUserByConnId(context.ConnectionId);
                var peer = roomMgr.GetUserById(userId);
                if (user == null) log.LogError($"user {user.Id} not found");
                else if (peer == null) log.LogError($"peer {user.Id} not found");
                else if (user.Room?.Id != peer.Room?.Id) log.LogError($"user is in room {user.Room?.Id} but peer is in room {peer.Room?.Id}");
                else
                {
                    log.LogInformation($"user {user.Id} sending an answer to peer {peer.Id}");
                    await ToClient(peer.SocketId, ClientEvent.answer, user, answer);
                }
            }
        }

        [FunctionName(nameof(Candidate))]
        public async Task Candidate([SignalRTrigger] InvocationContext context, string userId, RTCIceCandidate candidate)
        {
            log.LogInformation($"{nameof(Candidate)}: {context.ConnectionId}");

            if (!string.IsNullOrWhiteSpace(userId) && candidate != null)
            {
                var user = roomMgr.GetUserByConnId(context.ConnectionId);
                var peer = roomMgr.GetUserById(userId);
                if (user == null) log.LogError($"user {user.Id} not found");
                else if (peer == null) log.LogError($"peer {user.Id} not found");
                else if (user.Room?.Id != peer.Room?.Id) log.LogError($"user is in room {user.Room?.Id} but peer is in room {peer.Room?.Id}");
                else
                {
                    log.LogInformation($"user {user.Id} sending a candidate to peer {peer.Id}");
                    await ToClient(peer.SocketId, ClientEvent.answer, user, candidate);
                }
            }
        }

        public enum ClientEvent
        {
            loggedIn,
            createdRoom,
            joinedRoom,
            joinedRoomFailed,
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
