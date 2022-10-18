using System;
using System.Collections.Generic;
using System.Text;

namespace azure_function.Data
{
    public class RTCSessionDescriptionInit
    {
        public string sdp { get; set; }
        public string type { get; set; }
    }
}
