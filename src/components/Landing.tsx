import './Landing.css'; // Import the CSS file

import { useEffect, useRef, useState } from "react";
import { Room } from "./Room";

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [joined, setJoined] = useState(false);

    const getCam = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
        if (videoRef.current) {
            videoRef.current.srcObject = new MediaStream([videoTrack]);
            videoRef.current.play();
        }
    }

    useEffect(() => {
        getCam();
    }, []);

    if (!joined) {
        return (
            <div className="landing-container">
                <div className="preview-container">
                    <h1 className="landing-header">Join the Room</h1>
                    <video className="preview-video" autoPlay ref={videoRef}></video>
                    <input
                        className="name-input"
                        type="text"
                        placeholder="Enter your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button
                        className="join-button"
                        onClick={() => setJoined(true)}
                        disabled={!name.trim()} // Disable if name is empty
                    >
                        Join
                    </button>
                </div>
            </div>
        );
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} setJoined={setJoined} />;
};
