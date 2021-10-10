using System;
using System.Collections.Generic;
using System.Text;

namespace signalr_function.Data
{
    public interface RTCSessionDescriptionInit
    {
        public string sdp { get; set; }
        public string type { get; set; }
    }

    public interface RTCIceCandidate
    {
        public string address { get; set; }
        public string candidate { get; set; }
        public string component { get; set; }
        public string foundation { get; set; }
        public int port { get; set; }
        public int priority { get; set; }
        public string protocol { get; set; }
        public string relatedAddress { get; set; }
        public int relatedPort { get; set; }
        public float sdpMLineIndex { get; set; }
        public string sdpMid { get; set; }
        public string tcpType { get; set; }
        public string type { get; set; }
        public string usernameFragment { get; set; }
        public string toJSON();
    }
}
