using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace azure_function.Cache
{
    public class RedisCache
    {
        private readonly ILogger<RedisCache> _logger;
        private readonly Task<RedisConnection> _redisConnectionFactory;
        private RedisConnection _conn;

        private const string CONNECTION_STRING_VARIABLE = "AzureRedisCacheConnectionString";
        private const string PREFIX_USER = "USER";
        private const string PREFIX_ROOM = "ROOM";

        public RedisCache(ILogger<RedisCache> logger)
        {
            _logger = logger;
            _redisConnectionFactory = RedisConnection.InitializeAsync(Environment.GetEnvironmentVariable(CONNECTION_STRING_VARIABLE));
        }

        private async Task<string> GetValue(string key)
        {
            _conn = await _redisConnectionFactory;
            var value = await _conn.BasicRetryAsync(async db => await db.StringGetAsync(key));
            _logger.LogDebug($"get {key} = {value}");
            return value;
        }

        private async Task SetValue(string key, string value)
        {
            _conn = await _redisConnectionFactory;
            await _conn.BasicRetryAsync(async db => await db.StringSetAsync(key, value, new TimeSpan(1, 0, 0)));
            _logger.LogDebug($"set {key} = {value}");
        }

        public async Task<string> GetUser(string userId)
        {
            return await GetValue($"{PREFIX_USER}{userId}");
        }

        public async Task SetUser(string userId, string json)
        {
            await SetValue($"{PREFIX_USER}{userId}", json);
        }

        public async Task<string> GetRoom(string roomId)
        {
            return await GetValue($"{PREFIX_ROOM}{roomId}");
        }

        public async Task SetRoom(string roomId, string json)
        {
            await SetValue($"{PREFIX_ROOM}{roomId}", json);
        }
    }
}
