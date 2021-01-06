"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
server_1.default((port) => {
    console.log(`Server is listening on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map