"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const Server = (callback) => {
    const app = express_1.default();
    const httpServer = http_1.createServer(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
        },
    });
    const DEFAULT_PORT = 5000;
    const toRoomId = (roomId) => roomId + '-room';
    const toInCallId = (roomId) => roomId + '-room-incall';
    const handleSocketConnection = () => {
        io.on('connection', (socket) => {
            console.log(`connection ${socket.id}`);
            const getRoom = () => [...socket.in(socket.id).rooms.values()].find((r) => r.endsWith('-room'));
            const getCallRoom = () => [...socket.in(socket.id).rooms.values()].find((r) => r.endsWith('-incall'));
            const setRoom = (roomName) => __awaiter(void 0, void 0, void 0, function* () {
                const currRoom = getRoom();
                if (currRoom)
                    socket.leave(currRoom);
                if (roomName) {
                    const roomId = toRoomId(roomName);
                    yield socket.join(roomId);
                    return roomId;
                }
                else
                    return null;
            });
            const setCallRoom = (roomName) => __awaiter(void 0, void 0, void 0, function* () {
                const currCall = getCallRoom();
                if (currCall)
                    yield socket.leave(currCall);
                if (roomName) {
                    const callRoomId = toInCallId(roomName);
                    yield socket.join(callRoomId);
                    return callRoomId;
                }
                else
                    return null;
            });
            const getRoomPeers = (roomId) => __awaiter(void 0, void 0, void 0, function* () { return [...(yield io.in(roomId).allSockets()).values()]; });
            const otherRoomPeers = (roomId) => __awaiter(void 0, void 0, void 0, function* () { return (yield getRoomPeers(roomId)).filter((p) => p !== socket.id); });
            const getPeers = (roomName) => __awaiter(void 0, void 0, void 0, function* () {
                const peers = yield otherRoomPeers(toRoomId(roomName));
                const inCallPeers = yield otherRoomPeers(toInCallId(roomName));
                return peers.length
                    ? peers.map((id) => ({
                        id,
                        inCall: inCallPeers.indexOf(id) !== -1,
                    }))
                    : [];
            });
            socket.on('join-room', (roomName) => __awaiter(void 0, void 0, void 0, function* () {
                console.log(`${socket.id} joining room ${roomName}`);
                const room = yield setRoom(roomName);
                // let others in this room know that this peer has joined
                socket.to(room).broadcast.emit('peer-joined-room', socket.id);
                // let this peer know which peers are already in this room/in call
                const peers = yield getPeers(roomName);
                socket.emit('joined-room', roomName, peers);
            }));
            socket.on('leave-room', (roomName) => {
                const currRoomId = getRoom();
                if (currRoomId) {
                    console.log(`${socket.id} leaving room ${currRoomId}`);
                    // let others in room know that peer left room
                    socket.in(currRoomId).broadcast.emit('peer-left-room', socket.id);
                    setCallRoom(null);
                    setRoom(null);
                }
            });
            socket.on('join-call', (roomName) => __awaiter(void 0, void 0, void 0, function* () {
                const roomId = getRoom();
                const callRoomId = yield setCallRoom(roomName);
                console.log(`user ${socket.id} joining call in ${callRoomId}`);
                const peers = yield getPeers(roomName);
                // let others in room know that a peer is joining the call
                socket.in(roomId).broadcast.emit('peer-joining-call', socket.id);
            }));
            socket.on('leave-call', (roomId) => __awaiter(void 0, void 0, void 0, function* () {
                const currCallRoomId = getCallRoom();
                if (currCallRoomId) {
                    console.log(`${socket.id} leaving call ${currCallRoomId}`);
                    // let others in call know that peer left call
                    socket.in(currCallRoomId).broadcast.emit('peer-left-call', socket.id);
                    setCallRoom(null);
                }
            }));
            // when a client is notified that a new peer is joining the call,
            // they will send an offer to that peer and expect an answer in return
            socket.on('offer', (peerId, offer) => {
                // client wants to send an offer to a peer
                console.log(`user ${socket.id} is sending an offer to ${peerId}`);
                socket.to(peerId).emit('offer', socket.id, offer);
            });
            socket.on('answer', (peerId, offer) => {
                // client wants to send an answer to a peer
                console.log(`user ${socket.id} is sending an answer to ${peerId}`);
                socket.to(peerId).emit('answer', socket.id, offer);
            });
            socket.on('disconnecting', () => {
                console.log('disconnecting ' + socket.id);
                socket.rooms.forEach((roomId) => {
                    socket.in(roomId).emit('peer-left-room', socket.id);
                });
            });
            socket.on('disconnect', () => {
                console.log('disconnect ' + socket.id);
            });
        });
    };
    handleSocketConnection();
    httpServer.listen(DEFAULT_PORT, () => callback(DEFAULT_PORT));
};
exports.default = Server;
//# sourceMappingURL=server.js.map