// 0 = Packet
// 1 = Requset (sent by reciever if it is missing some packets and it has Final Packet) [deprecated]
// 2 = Packet Acknowledgement (sent by reciever)
// 3 = Final Packet
function encode({ Version = 1, Protocol = 128, PacketType, Sequence, Length, PacketID }) {
    if (PacketType > 3) throw Error('Packet Type is over 2 bits.');
    if (Sequence > 31) throw Error('Sequence is over 5 bits.');
    if (Length > 511) throw Error('Length is over 9 bits.');
    if (Version > 255) throw Error('Version is over 8 bits.');
    if (Protocol > 255) throw Error('Protocol is over 8 bits.');
    if (PacketID.length > 4) throw Error('Packet ID is over 32 bits.');

    const packet = Buffer.alloc(8);
    packet[0] = Version;
    packet[1] = Protocol;
    packet[2] = (PacketType << 6) | (Sequence << 1) | (Length >> 8);
    packet[3] = Length & 255;

    packet.set(PacketID, 4);

    return packet;
}

function decode(packet) {
    const Version = packet[0];
    const Protocol = packet[0];
    const PacketType = (packet[2] >> 6) & 3;
    const Sequence = (packet[2] >> 31) & 31;
    const Length = ((packet[2] & 1) << 8) | packet[3];

    const PacketID = packet.subarray(4, 8);

    return {
        Version,
        Protocol,
        PacketType,
        Sequence,
        Length,
        PacketID
    };
}

module.exports = {
    encode,
    decode
}