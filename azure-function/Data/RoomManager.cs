using azure_function.Cache;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace azure_function.Data
{
    public class RoomManager
    {
        private readonly RedisCache _cache;
        private readonly ILogger<RoomManager> _log;

        public RoomManager(RedisCache cache, ILogger<RoomManager> logger)
        {
            _cache = cache;
            _log = logger;
        }

        private string RandomId()
        {
            StringBuilder builder = new StringBuilder();
            Enumerable
               .Range(65, 26)
                .Select(e => ((char)e).ToString())
                .Concat(Enumerable.Range(97, 26).Select(e => ((char)e).ToString()))
                .Concat(Enumerable.Range(0, 10).Select(e => e.ToString()))
                .OrderBy(e => Guid.NewGuid())
                .Take(6)
                .ToList().ForEach(e => builder.Append(e));
            return builder.ToString().ToLower();
        }

        public async Task<User> GetUser(string userId)
        {
            _log.LogTrace($"GetUser({userId})");
            var user = await _cache.GetUser(userId);
            if (user == null)
            {
                _log.LogWarning($"user {user} not found");
                return null;
            }
            return JsonConvert.DeserializeObject<User>(user);
        }

        public async Task<Room> GetRoom(string roomId)
        {
            _log.LogTrace($"GetRoom({roomId})");
            string room = await _cache.GetRoom(roomId);
            if (room == null)
            {
                _log.LogWarning($"room {room} not found");
                return null;
            }
            return JsonConvert.DeserializeObject<Room>(room);
        }

        public async Task SaveUser(User user)
        {
            _log.LogTrace($"SaveUser({user.Id})");
            await _cache.SetUser(user.Id, JsonConvert.SerializeObject(user));
        }

        public async Task SaveRoom(Room room)
        {
            _log.LogTrace($"SaveRoom({room.Id})");
            await _cache.SetRoom(room.Id, JsonConvert.SerializeObject(room));
        }

        private async Task AddOrUpdateUserForRoom(User user, Room room)
        {
            _log.LogTrace($"AddUserToRoom({user.Id}, {user.RoomId})");
            user.RoomId = room.Id;
            await SaveUser(user);

            // add/update user in room
            room.Users = room.Users.Where(u => u.Id != user.Id).Concat(new[] { user });
            await SaveRoom(room);
            _log.LogInformation($"added (or updated) user {user.Id} to room {room.Id}");
        }

        private async Task RemoveUserFromRoom(User user, Room room)
        {
            _log.LogTrace($"RemoveUserFromRoomUserList({user.Id}, {user.RoomId})");
            user.RoomId = room.Id;
            user.InCall = false;
            await SaveUser(user);

            room.Users = room.Users.Where(u => u.Id != user.Id);
            await SaveRoom(room);
            _log.LogInformation($"removed user {user.Id} from room {room.Id}");
        }

        public async Task<User> ReconnectOrAddUser(string userId)
        {
            _log.LogTrace($"ReconnectOrAddUser({userId})");
            var user = await GetUser(userId);
            if (user == null)
            {
                user = new User()
                {
                    Id = userId
                };
                await SaveUser(user);
                _log.LogInformation($"Added user {userId}");
            }
            return user;
        }

        public async Task<string> AddRoom(string userId, string roomName)
        {
            _log.LogTrace($"AddRoom({userId}, {roomName})");

            string id = RandomId();
            while ((await GetRoom(id)) != null) id = RandomId();

            var room = new Room()
            {
                Id = id,
                Name = roomName,
                CreatedBy = userId
            };
            await SaveRoom(room);
            _log.LogInformation($"added new room {roomName} with id {id}");
            return id;
        }

        public async Task UserLeaveRoom(string userId)
        {
            _log.LogTrace($"UserLeaveRoom({userId})");
            User user = await GetUser(userId);
            Room room = await GetRoom(user?.RoomId);
            if (user == null || room == null) return;

            await RemoveUserFromRoom(user, room);
            _log.LogInformation($"{user.Id} left room {user.RoomId}");
        }

        public async Task UserJoinRoom(string userId, string roomId)
        {
            _log.LogTrace($"UserJoinRoom({userId})");
            User user = await GetUser(userId);
            Room room = await GetRoom(roomId);
            if (user == null || room == null) return;

            await AddOrUpdateUserForRoom(user, room);
            _log.LogInformation($"{user.Id} joined room {user.RoomId}");
        }

        public async Task UserJoinCall(User user, Room room)
        {
            _log.LogTrace($"UserJoinCall({user?.Id}, {room?.Id})");
            if (user == null || room == null) return;

            user.InCall = true;
            await AddOrUpdateUserForRoom(user, room);
            _log.LogInformation($"{user.Id} joined call in room {user.RoomId}");
        }

        public async Task UserLeaveCall(User user, Room room)
        {
            _log.LogTrace($"UserLeaveCall({user?.Id}, {room?.Id})");
            if (user == null || room == null) return;

            user.InCall = false;
            await AddOrUpdateUserForRoom(user, room);
            _log.LogInformation($"{user.Id} left call in room {user.RoomId}");
        }

        public async Task<User> SetUserProfile(string userId, string userName, string avatar, string sound)
        {
            _log.LogTrace($"SetUserProfile({userId}, {userName})");
            User user = await GetUser(userId);
            if (user == null) return null;

            user.Name = userName;
            user.Avatar = avatar;
            user.Sound = sound;

            await SaveUser(user);

            if (user.RoomId != null)
            {
                Room room = await GetRoom(user.RoomId);
                await AddOrUpdateUserForRoom(user, room);
            }
            _log.LogInformation($"{user.Id} set profile to {userName} {avatar} {sound}");

            return user;
        }

        public async Task ValidateUsersInSameRoom(IEnumerable<string> userIds)
        {
            List<User> users = new List<User>();
            foreach (var id in userIds)
            {
                // make sure user exists
                User user = await GetUser(id);
                if (user == null)
                {
                    string err = $"ValidateUsersInSameRoom: user {id} not found";
                    _log.LogError(err);
                    throw new Exception(err);
                }
                users.Add(user);

                // make sure this user is in same room as all other users
                User wrongRoomUser = users.FirstOrDefault(u => u.RoomId != user.RoomId);
                if (wrongRoomUser != null)
                {
                    string err = $"ValidateUsersInSameRoom: user {user.Id} is in room {user.RoomId} but user {wrongRoomUser.Id} user is in room {wrongRoomUser.RoomId}";
                    _log.LogError(err);
                    throw new Exception(err);
                }
            }
        }
    }
}
