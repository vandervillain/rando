using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace azure_function.Data
{
    public class Room
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("users")]
        public IEnumerable<User> Users { get; set; } = new List<User>();

        [JsonIgnore]
        public string CreatedBy { get; set; }
    }
}
