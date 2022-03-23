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
      log = logger;
      activeUsers = new List<ActiveUser>();
      activeRooms = new List<ActiveRoom>();

      var timer1 = new Timer(_ =>
      {
        activeRooms.Where(r => r.DestroyBy != null && r.DestroyBy < DateTime.Now).ToList().ForEach(r =>
        {
          log.LogWarning($"removing room {r.Name}");
          activeRooms.Remove(r);
        });
        activeUsers.Where(u => u.DestroyBy != null && u.DestroyBy < DateTime.Now).ToList().ForEach(u =>
        {
          log.LogWarning($"removing user {u.Name}");
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

    public ActiveUser GetUserById(string userId)
    {
      return activeUsers.FirstOrDefault(u => u.Id == userId);
    }

    public ActiveUser GetUserByConnId(string connectionId)
    {
      return activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
    }

    public List<ActiveUser> GetUsersInRoom(string roomId)
    {
      return activeUsers.Where(u => u.RoomId != null && u.RoomId == roomId).ToList();
    }

    public ActiveRoom GetRoom(string roomId)
    {
      return activeRooms.FirstOrDefault(r => r.Id == roomId);
    }

    public ActiveUser ReconnectOrAddUser(string userId, string connectionId)
    {
      var user = activeUsers.FirstOrDefault(u => u.Id == userId);
      if (user == null)
        return AddActiveUser(userId, connectionId);

      user.SocketId = connectionId;
      user.DestroyBy = null;
      log.LogWarning($"user {user.Name} will not disconnect");
      return user;
    }

    public ActiveUser AddActiveUser(string userId, string connectionId)
    {
      var user = activeUsers.FirstOrDefault(u => u.Id == userId);
      if (user == null)
      {
        user = new ActiveUser()
        {
          Id = userId,
          SocketId = connectionId
        };
        activeUsers.Add(user);
        log.LogWarning($"Added user {userId}, {connectionId}");
      }
      else user.SocketId = connectionId;
      return user;
    }

    public void DisconnectUser(string connectionId)
    {
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
      if (user != null) {
        log.LogWarning($"user {user.Name} disconnecting soon");
        user.DestroyBy = new DateTime().AddMilliseconds(userExpiration);
      }
    }

    public string AddActiveRoom(string connectionId, string roomName)
    {
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);

      if (user != null)
      {
        string id = RandomId();
        while (activeRooms.Any(r => r.Id == id)) id = RandomId();

        activeRooms.Add(new ActiveRoom()
        {
          Id = id,
          Name = roomName,
          CreatedBy = user.Id
        });
        log.LogWarning($"added new room {roomName} with id {id}");
        return id;
      }
      return null;
    }

    public ActiveUser UserLeaveRoom(string connectionId)
    {
      log.LogWarning($"UserLeaveRoom connId {connectionId}");
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
      if (user != null)
      {
        user.InCall = false;
        if (user.RoomId != null)
        {
          var room = activeRooms.FirstOrDefault(r => r.Id == user.RoomId);
          if (room != null)
          {
            room.UserCount--;
            if (room.UserCount <= 0)
              room.DestroyBy = DateTime.Now.AddMilliseconds(emptyRoomExpiration);
          }
          user.RoomId = null;
          log.LogWarning($"removed user {user.Name} from room {room.Name}");
        }
      }
      return user;
    }

    public ActiveUser UserJoinRoom(string connectionId, string roomId)
    {
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
      var room = activeRooms.FirstOrDefault(r => r.Id == roomId);
      if (user != null && room != null)
      {
        user.RoomId = room.Id;
        room.UserCount++;
        room.DestroyBy = null;
        log.LogWarning($"user {user.Name} joined room {room.Name}");
      }
      return user;
    }

    public ActiveUser UserJoinCall(string connectionId)
    {
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
      if (user != null) {
        user.InCall = true;
        log.LogWarning($"user {user.Name} joined call in room {user.RoomId}");
      }
      return user;
    }

    public ActiveUser UserLeaveCall(string connectionId)
    {
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
      if (user != null) {
        user.InCall = false;
        log.LogWarning($"user {user.Name} left call in room {user.RoomId}");
      }
      return user;
    }

    public ActiveUser SetUserName(string connectionId, string userName)
    {
      var user = activeUsers.FirstOrDefault(u => u.SocketId == connectionId);
      if (user != null) {
        log.LogWarning($"user {user.Name} has changed name to {userName}");
        user.Name = userName;
      }
      return user;
    }
  }

  public class ActiveUser
  {
    [JsonProperty("id")]
    public string Id { get; set; }

    [JsonProperty("socketId")]
    public string SocketId { get; set; }

    [JsonProperty("name")]
    public string Name { get; set; }

    [JsonProperty("roomId")]
    public string RoomId { get; set; }

    [JsonProperty("inCall")]
    public bool InCall { get; set; }

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
    public int UserCount { get; set; }

    [JsonIgnore]
    public string CreatedBy { get; set; }

    [JsonIgnore]
    public DateTime? DestroyBy { get; set; }
  }
}
