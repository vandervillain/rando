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
using azure_function.Cache;

namespace azure_function.Functions
{
    public class RoomFunctions : ServerlessHub
    {
        private readonly RoomManager _roomMgr;
        private readonly ILogger<RoomFunctions> _logger;

        public RoomFunctions(RoomManager mgr, ILogger<RoomFunctions> logger)
        {
            _roomMgr = mgr;
            _logger = logger;
        }

        [FunctionName(nameof(Login))]
        public async Task<IActionResult> Login([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req,
        [SignalR(HubName = nameof(RoomFunctions))] IAsyncCollector<SignalRMessage> signalRMessages)
        {
            _logger.LogDebug($"{nameof(Login)}: {req.GetDisplayUrl()}");
            bool authorized = true;
            if (!authorized)
            {
                _logger.LogError("Unauthorized Request");
                return new UnauthorizedResult();
            }

            using (StreamReader streamReader = new StreamReader(req.Body))
            {
                string requestBody = await streamReader.ReadToEndAsync();
                User user = await Task.Run(() => JsonConvert.DeserializeObject<User>(requestBody));
                return new OkObjectResult(user);
            }
        }

        private async Task ToUser(string userId, ClientEvent eventType, params object[] args)
        {
            await Clients.User(userId).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToRoom(string roomId, ClientEvent eventType, params object[] args)
        {
            await Clients.Group(roomId).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ToPeers(string userId, string connectionId, ClientEvent eventType, params object[] args)
        {
            User user = await _roomMgr.GetUser(userId);
            await ToPeers(user, connectionId, eventType, args);
        }

        private async Task ToPeers(User user, string connectionId, ClientEvent eventType, params object[] args)
        {
            if (user == null || user.RoomId == null) return;
            await Clients.GroupExcept(user.RoomId, new string[] { connectionId }).SendCoreAsync(eventType.ToString(), args);
        }

        private async Task ExitRoom(string userId)
        {
            _logger.LogDebug($"ExitRoom({userId})");

            string roomId = (await _roomMgr.GetUser(userId))?.RoomId;
            if (roomId == null) return;

            await _roomMgr.UserLeaveRoom(userId);
            Room room = await _roomMgr.GetRoom(roomId);

            // tell former peers that user left
            _logger.LogInformation($"telling peers {string.Join(',', room.Users.Select(u => u.Id))} that {userId} left room {room.Id}");
            await ToRoom(room.Id, ClientEvent.peerLeftRoom, userId, room);
        }

        [FunctionName(nameof(Negotiate))]
        public async Task<SignalRConnectionInfo> Negotiate([HttpTrigger(AuthorizationLevel.Anonymous)] HttpRequest req)
        {
            _logger.LogDebug($"{req.Method} {req.GetDisplayUrl()}");
            string userId = req.Headers["x-ms-signalr-user-id"];
            if (userId != null) await ToUser(userId, ClientEvent.forceDisconnect);
            return Negotiate(userId);
        }

        [FunctionName(nameof(OnConnected))]
        public async Task OnConnected([SignalRTrigger] InvocationContext context)
        {
            await _roomMgr.ReconnectOrAddUser(context.UserId);
        }

        [FunctionName(nameof(OnReconnected))]
        public async Task OnReconnected([SignalRTrigger] InvocationContext context)
        {
            await _roomMgr.ReconnectOrAddUser(context.UserId);
        }

        [FunctionName(nameof(OnDisconnected))]
        public async Task OnDisconnected([SignalRTrigger] InvocationContext context)
        {
            _logger.LogDebug($"{nameof(OnDisconnected)}: {context.UserId}, {context.ConnectionId}");
            await ExitRoom(context.UserId);
        }

        [FunctionName(nameof(SetUserProfile))]
        public async Task SetUserProfile([SignalRTrigger] InvocationContext context, string userName, string avatar = null, string sound = null)
        {
            _logger.LogDebug($"{nameof(SetUserProfile)}: {context.UserId}, {userName}, {avatar}, {sound}");

            User user = await _roomMgr.SetUserProfile(context.UserId, userName, avatar, sound);
            if (user.RoomId != null)
            {
                Room room = await _roomMgr.GetRoom(user.RoomId);
                await ToRoom(user.RoomId, ClientEvent.peerChangedName, user, room);
            }
        }

        [FunctionName(nameof(CreateRoom))]
        public async Task<string> CreateRoom([SignalRTrigger] InvocationContext context, string roomName)
        {
            _logger.LogDebug($"{nameof(CreateRoom)}: {context.UserId}, {roomName}");

            await ExitRoom(context.UserId);
            var roomId = await _roomMgr.AddRoom(context.UserId, roomName);
            return roomId;
        }

        [FunctionName(nameof(JoinRoom))]
        public async Task<object> JoinRoom([SignalRTrigger] InvocationContext context, string roomId)
        {
            _logger.LogDebug($"{nameof(JoinRoom)}: {context.UserId}, {roomId}");

            await ExitRoom(context.UserId);
            await _roomMgr.UserJoinRoom(context.UserId, roomId);

            User user = await _roomMgr.GetUser(context.UserId);
            Room room = await _roomMgr.GetRoom(roomId);

            _logger.LogInformation($"telling peers {string.Join(',', room.Users.Where(u => u.Id != user.Id).Select(u => u.Id))} that {user.Id} joined room {roomId}");
            await Groups.AddToGroupAsync(context.ConnectionId, roomId);
            await ToPeers(user.Id, context.ConnectionId, ClientEvent.peerJoinedRoom, user, room);
            return new
            {
                room = room
            };
        }

        [FunctionName(nameof(JoinCall))]
        public async Task JoinCall([SignalRTrigger] InvocationContext context)
        {
            _logger.LogDebug($"{nameof(JoinCall)}: {context.UserId}, {context.ConnectionId}");

            User user = await _roomMgr.GetUser(context.UserId);
            Room room = await _roomMgr.GetRoom(user?.RoomId);
            if (user == null || room == null) return;

            await _roomMgr.UserJoinCall(user, room);

            await ToRoom(user.RoomId, ClientEvent.peerJoiningCall, user, room);
        }

        [FunctionName(nameof(LeaveRoom))]
        public async Task LeaveRoom([SignalRTrigger] InvocationContext context)
        {
            _logger.LogDebug($"{nameof(LeaveRoom)}: {context.UserId}, {context.ConnectionId}");
            await ExitRoom(context.UserId);
        }

        [FunctionName(nameof(LeaveCall))]
        public async Task LeaveCall([SignalRTrigger] InvocationContext context)
        {
            _logger.LogDebug($"{nameof(LeaveRoom)}: {context.UserId}, {context.ConnectionId}");
            User user = await _roomMgr.GetUser(context.UserId);
            Room room = await _roomMgr.GetRoom(user?.RoomId);
            if (user == null || room == null) return;

            await _roomMgr.UserLeaveCall(user, room);
            await ToRoom(user.RoomId, ClientEvent.peerLeftCall, user, room);
        }

        [FunctionName(nameof(Offer))]
        public async Task Offer([SignalRTrigger] InvocationContext context, string peerId, RTCSessionDescriptionInit offer)
        {
            _logger.LogDebug($"{nameof(Offer)}: {context.UserId}, {context.ConnectionId}");

            await _roomMgr.ValidateUsersInSameRoom(new[] { context.UserId, peerId });

            _logger.LogInformation($"user {context.UserId} sending an offer to peer {peerId}");
            await ToUser(peerId, ClientEvent.offer, context.UserId, offer);
        }

        [FunctionName(nameof(Answer))]
        public async Task Answer([SignalRTrigger] InvocationContext context, string peerId, RTCSessionDescriptionInit answer)
        {
            _logger.LogDebug($"{nameof(Answer)}: {context.UserId}, {context.ConnectionId}");

            await _roomMgr.ValidateUsersInSameRoom(new[] { context.UserId, peerId });

            _logger.LogInformation($"user {context.UserId} sending an answer to peer {peerId}");
            await ToUser(peerId, ClientEvent.answer, context.UserId, answer);
        }

        [FunctionName(nameof(Candidate))]
        public async Task Candidate([SignalRTrigger] InvocationContext context, string peerId, RTCIceCandidate candidate)
        {
            _logger.LogDebug($"{nameof(Candidate)}: {context.UserId}, {context.ConnectionId}");

            await _roomMgr.ValidateUsersInSameRoom(new[] { context.UserId, peerId });

            _logger.LogInformation($"user {context.UserId} sending a candidate to peer {peerId}");
            await ToUser(peerId, ClientEvent.candidate, context.UserId, candidate);
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
            candidate,
            // prevent multiple pages of same connection
            forceDisconnect
        }
    }
}
