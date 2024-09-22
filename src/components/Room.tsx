import './Room.css';

import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";

const URL = "https://api.vibenext.bharatsharma.co";

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack,
    setJoined
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
    setJoined: (value: boolean) => void
}) => {
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<null | Socket>(null);
    const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>();
    const localVideoRef = useRef<HTMLVideoElement>();

    useEffect(() => {
        const socket = io(URL);

        // Event for handling disconnection
        socket.on('user-disconnected', () => {
            setLobby(true);
            setJoined(false);
            alert('The other user has disconnected.');
        });

        socket.on('send-offer', async ({ roomId }) => {
            console.log("sending offer");
            setLobby(false);
            const pc = new RTCPeerConnection();

            setSendingPc(pc);
            if (localVideoTrack) {
                console.error("added track");
                console.log(localVideoTrack);
                pc.addTrack(localVideoTrack);
            }
            if (localAudioTrack) {
                console.error("added track");
                console.log(localAudioTrack);
                pc.addTrack(localAudioTrack);
            }

            pc.onicecandidate = async (e) => {
                console.log("receiving ice candidate locally");
                if (e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId
                    });
                }
            };

            pc.onnegotiationneeded = async () => {
                console.log("on negotiation needed, sending offer");
                const sdp = await pc.createOffer();
                //@ts-ignore
                pc.setLocalDescription(sdp);
                socket.emit("offer", {
                    sdp,
                    roomId
                });
            };
        });

        socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
            console.log("received offer");
            setLobby(false);
            const pc = new RTCPeerConnection();
            pc.setRemoteDescription(remoteSdp);
            const sdp = await pc.createAnswer();
            //@ts-ignore
            pc.setLocalDescription(sdp);
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }

            setRemoteMediaStream(stream);
            setReceivingPc(pc);
            pc.ontrack = (e) => {
                // Handle incoming media streams here
                console.log("Received track", e);
            };

            pc.onicecandidate = async (e) => {
                if (!e.candidate) return;
                socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                });
            };

            socket.emit("answer", {
                roomId,
                sdp: sdp
            });

            setTimeout(() => {
                const track1 = pc.getTransceivers()[0].receiver.track;
                const track2 = pc.getTransceivers()[1].receiver.track;
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2);
                    setRemoteVideoTrack(track1);
                } else {
                    setRemoteAudioTrack(track1);
                    setRemoteVideoTrack(track2);
                }
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = new MediaStream([track1, track2]);
                }
            }, 5000);
        });

        socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
            setLobby(false);
            setSendingPc(pc => {
                pc?.setRemoteDescription(remoteSdp);
                return pc;
            });
        });

        socket.on("add-ice-candidate", ({ candidate, type }) => {
            if (type === "sender") {
                setReceivingPc(pc => {
                    pc?.addIceCandidate(candidate);
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    pc?.addIceCandidate(candidate);
                    return pc;
                });
            }
        });

        setSocket(socket);
    }, [name]);

    useEffect(() => {
        if (localVideoRef.current && localVideoTrack) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            localVideoRef.current.play();
        }
    }, [localVideoTrack]);

    return (
        <div className="room-container">
            <h1 className="room-header">Hi {name}</h1>
            <div className="videos-container">
                <div className="video-wrapper">
                    <h2>Your Video</h2>
                    <video className="video-player" autoPlay ref={localVideoRef} />
                </div>
                <div className="video-wrapper">
                    <h2>Friend Video</h2>
                    <video className="video-player" autoPlay ref={remoteVideoRef} />
                </div>
            </div>
            {lobby && <p className="lobby-message">Waiting to connect you to someone...</p>}
        </div>
    );
};
