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
        protected ILogger<RoomManager> log;
        private List<ActiveUser> activeUsers;
        private List<ActiveRoom> activeRooms;

        // empty rooms expire in 5 min
        private const int emptyRoomExpiration = 1000 * 60 * 5;
        // user expire in 15 seconds
        private const int userExpiration = 1000 * 15;

        public RoomManager(ILogger<RoomManager> logger)
        {
            logger.LogDebug("RoomManager()");
            log = logger;
            activeUsers = new List<ActiveUser>();
            activeRooms = new List<ActiveRoom>();

            var timer1 = new Timer(_ =>
            {
                activeRooms.Where(r => r.DestroyBy != null && r.DestroyBy < DateTime.Now).ToList().ForEach(r =>
          {
              log.LogInformation($"destroying room {r.Name}");
              activeRooms.Remove(r);
          });
                activeUsers.Where(u => u.DestroyBy != null && u.DestroyBy < DateTime.Now).ToList().ForEach(u =>
          {
              log.LogInformation($"destroying user {u.Name}");
              activeUsers.Remove(u);
          });
            }, null, 0, userExpiration);
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

        public ActiveUser GetUser(string userId)
        {
            log.LogDebug($"searching for user by id {userId} in list {string.Join(", ", activeUsers.Select(u => u.Id))}");
            var user = activeUsers.FirstOrDefault(u => u.Id == userId);
            if (user == null) log.LogWarning($"user {user} not found in active list");
            return user;
        }

        public ActiveRoom GetRoom(string roomId)
        {
            log.LogDebug($"searching for room by id {roomId} in list {string.Join(", ", activeRooms.Select(u => u.Id))}");
            var room = activeRooms.FirstOrDefault(r => r.Id == roomId);
            if (room == null) log.LogWarning($"room {roomId} not found in active list");
            return room;
        }

        public List<ActiveUser> GetUsersInRoom(string roomId)
        {
            return activeUsers.Where(u => u.RoomId == roomId).ToList();
        }

        public ActiveUser ReconnectOrAddUser(string userId)
        {
            log.LogDebug($"ReconnectOrAddUser({userId})");
            var user = GetUser(userId);
            if (user == null)
            {
                user = new ActiveUser()
                {
                    Id = userId
                };
                activeUsers.Add(user);
                log.LogInformation($"Added user {userId}");
            }
            else
            {
                user.DestroyBy = null;
                log.LogDebug($"user {user.Name} ({user.Id}) will not disconnect");
            }
            return user;
        }

        public void DisconnectUser(string userId)
        {
            log.LogDebug($"DisconnectUser({userId})");
            var user = GetUser(userId);
            if (user == null) return;

            user.DestroyBy = new DateTime().AddMilliseconds(userExpiration);
            log.LogInformation($"{user.Name} ({user.Id}) disconnecting in {userExpiration}ms");
        }

        public string AddActiveRoom(string userId, string roomName)
        {
            log.LogDebug($"AddActiveRoom({userId}, {roomName})");
            var user = GetUser(userId);
            if (user == null) return null;

            string id = RandomId();
            while (activeRooms.Any(r => r.Id == id)) id = RandomId();

            activeRooms.Add(new ActiveRoom()
            {
                Id = id,
                Name = roomName,
                CreatedBy = user.Id
            });
            log.LogInformation($"added new room {roomName} with id {id}");
            return id;
        }

        public ActiveUser UserLeaveRoom(string userId)
        {
            log.LogDebug($"UserLeaveRoom({userId})");
            var user = GetUser(userId);
            if (user == null) return null;

            user.InCall = false;
            if (user.RoomId == null) return user;

            var room = GetRoom(user.RoomId);
            if (room != null && activeUsers.Where(u => u.RoomId == room.Id).Count() == 0)
                room.DestroyBy = DateTime.Now.AddMilliseconds(emptyRoomExpiration);

            user.RoomId = null;
            log.LogInformation($"removed {user.Name} ({user.Id}) from room {room.Name}");

            return user;
        }

        public ActiveUser UserJoinRoom(string userId, string roomId)
        {
            log.LogDebug($"UserJoinRoom({userId}, {roomId})");
            var user = GetUser(userId);
            var room = GetRoom(roomId);

            if (user == null || room == null) return null;

            user.RoomId = room.Id;
            room.DestroyBy = null;
            log.LogInformation($"{user.Name} ({user.Id}) joined room {room.Name}");
            return user;
        }

        public ActiveUser UserJoinCall(string userId)
        {
            log.LogDebug($"UserJoinCall({userId})");
            var user = GetUser(userId);
            if (user != null)
            {
                user.InCall = true;
                log.LogInformation($"{user.Name} ({user.Id}) joined call in room {user.RoomId}");
            }
            else log.LogWarning($"user {userId} not found in active users");
            return user;
        }

        public ActiveUser UserLeaveCall(string userId)
        {
            log.LogDebug($"UserLeaveCall({userId})");
            var user = GetUser(userId);
            if (user != null)
            {
                user.InCall = false;
                log.LogInformation($"{user.Name} ({user.Id}) left call in room {user.RoomId}");
            }
            else log.LogWarning($"user {userId} not found in active users");
            return user;
        }

        public ActiveUser SetUserProfile(string userId, string userName, string avatar, string sound)
        {
            log.LogDebug($"SetUserProfile({userId}, {userName})");
            var user = GetUser(userId);
            if (user == null) return null;

            user.Name = userName;
            user.Avatar = avatar;
            user.Sound = sound;
            log.LogInformation($"{user.Id} set profile to {userName} {avatar} {sound}");

            return user;
        }
    }

    public class ActiveUser
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("roomId")]
        public string RoomId { get; set; }

        [JsonProperty("inCall")]
        public bool InCall { get; set; }

        [JsonProperty("avatar")]
        public string Avatar { get; set; }

        [JsonProperty("sound")]
        public string Sound { get; set; }

        [JsonIgnore]
        public DateTime? DestroyBy { get; set; }
    }

    public class ActiveRoom
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonIgnore]
        public string CreatedBy { get; set; }

        [JsonIgnore]
        public DateTime? DestroyBy { get; set; }
    }
}
