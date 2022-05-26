const dgram = require('dgram');
const EventEmitter = require('events');
const { encode, decode } = require('./packet.js');

const crypto = require('crypto');

const ip6addr = require('ip6addr')

function encodeConnectionInfo({ address, port }) {
    const raw = Buffer.alloc(18)
    raw.set(ip6addr.parse(address).toBuffer())
    raw.writeUInt16LE(port, 16)
    return raw
}

const MSG_TYPES = {
    0: "Packet",
    1: "Request",
    2: "PacketAck",
    3: "LastPacket"
}

class PeerSocket extends EventEmitter {
    constructor() {
        super()
        
        this.server = dgram.createSocket('udp6');

        this.packets = {};

        this.sendPackets = {};

        this.server.on("message", (msg, rinfo) => {
            this.handleMsg(msg, rinfo);
        })
    }

    send(msg, port, address) {
        const PacketID = crypto.randomBytes(4);
        const header = encode({
            PacketType: 3,
            Sequence: 0,
            Length: msg.length,
            PacketID
        })

        this.sendPackets[Buffer.concat([PacketID, encodeConnectionInfo({
            port,
            address
        })]).toString('binary')] = {acks: [], packets: { 0: msg }, tries: 0, date: Date.now()};


        this.server.send(Buffer.concat([header, msg]), port, address)
    }

    handleMsg(msg, rinfo) {
        const msgInfo = decode(msg);

        const packetIDEntry = Buffer.concat([msgInfo.PacketID, encodeConnectionInfo({
            port: rinfo.port,
            address: rinfo.address
        })]).toString('binary');

        console.log(MSG_TYPES[msgInfo.PacketType])

        if (msgInfo.PacketType !== 2 && msgInfo.PacketType !== 1) {
            if (!this.packets[packetIDEntry]) {
                this.packets[packetIDEntry] = {
                    packets: {},
                    final: null
                }
            }
        } else {
            if (!this.sendPackets[packetIDEntry]) return;
        }

        switch(msgInfo.PacketType) {
            case 3: {
                const ackHeader = encode({
                    PacketType: 2,
                    Sequence: msgInfo.Sequence,
                    Length: msgInfo.Length,
                    PacketID: msgInfo.PacketID
                });
                this.server.send(ackHeader, rinfo.port, rinfo.address)
                break;
            }
        }
    }

    bind(port, callback) {
        return this.server.bind(port, callback);
    }
}

const a = new PeerSocket();
a.bind(8000)

const b = new PeerSocket();
b.send(Buffer.from("hello"), 8000, "::ffff:127.0.0.1")