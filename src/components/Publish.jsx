import styles from '../Publish.module.css';
import {io} from 'socket.io-client'
import { createEffect, createSignal, onMount } from 'solid-js';

function Publish() {

    const[socket,setSocket] = createSignal()
    const[connectedPeers,setConnectedPeers] = createSignal(0)
    const[publishing,setPublishing] = createSignal(false)

    let videoElem;
    let peers = new Map()
    let videoStream;
    let videoSender;
    let audioSender;

    onMount(()=>{
        setSocket(io('https://melodious-efficient-oatmeal.glitch.me'))
    })


    const publishVideo=async()=>{
      try{
        videoStream = await navigator.mediaDevices.getUserMedia({video:true,audio:{
            noiseSuppression:true,
            echoCancellation:true
        }})
        videoElem.srcObject = videoStream;
        if(!publishing()){
          setPublishing(true)
          socket()?.emit('addPublisher')
        }
      }
      catch(err){
        console.log(err)
      }
    }

    const publishScreen=async()=>{
        try{
          videoStream = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{
              noiseSuppression:true,
              echoCancellation:true
          }})
          videoElem.srcObject = videoStream;
          videoStream?.getVideoTracks()[0]?.addEventListener("ended", () => Stop());
          if(!publishing()){
            setPublishing(true)
            socket()?.emit('addPublisher')
          }
        }
        catch(err){
          console.log(err)
        }
      }

      async function sendOffer(id){
        const peer = peers.get(id)
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer)
        socket().emit('getOffer',{
          socketId:id,
          offer:offer,
          id:socket()?.id
        })
       }

      createEffect(()=>{
        if(!socket()) return;
        socket()?.on("startPeerCon",async(data)=>{
          peerConnection(data?.id)
          await sendOffer(data?.id)
        })
      })


      const configuration={
        iceServers:[
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
              },
            {
                url:'stun:stun.I.google.com:19302'
            },
            {
                url:'stun:stun1.l.google.com:19302'
            },
            {
                url:'stun:stun2.l.google.com:19302'
            }
        ]
    }

    function peerConnection(id){
      const peerCon = new RTCPeerConnection(configuration)
        peers.set(id,peerCon)
        setConnectedPeers((prev)=>prev+1)

        const peer = peers.get(id)
   
        peer.onicecandidate = (event)=>{
        if(event.candidate){
            socket().emit('getIce',{
                socketId:id,
                candidate:event.candidate,
                id:socket()?.id
            })
        }
       }
   
       peer.onconnectionstatechange= async(e)=>{
          if(e.currentTarget?.connectionState==='failed' || e.currentTarget?.connectionState==='disconnected'){
            const peer = peers.get(id)
            if(!peer) return;
            await peer.close();
            peers.delete(id)
            setConnectedPeers(connectedPeers()-1)
          }
       }

      //  Can Be Done With Add Track As Well But Add Transceiver Is Preferred. Add Track Preferred Here For Cross Browser Support
      videoStream?.getTracks()?.forEach((track)=>{
        if(track?.kind==='video'){
          videoSender = peer.addTrack(track,videoStream);
        }
        else{
          audioSender = peer.addTrack(track,videoStream);
        }
      })
   
      //  let trans = peers[id].addTransceiver(videoStream?.getVideoTracks()[0],{
      //   direction:"sendonly",
      //   // sendEncodings: [
      //   //     {rid: 'r0',scaleResolutionDownBy:1.0,maxBitrate:700000},
      //   //     {rid: 'r1', scaleResolutionDownBy: 2.0,maxBitrate:350000},
      //   //     {rid: 'r2', scaleResolutionDownBy: 4.0,maxBitrate:50000},
      //   //   ],
      //   streams:[videoStream]
      // });

      // console.log(trans,'trans',trans?.sender?.getParameters())

      // if(videoStream?.getAudioTracks()[0]){
      //   peers[id].addTransceiver(videoStream?.getAudioTracks()[0],{
      //       direction:"sendonly",
      //       streams:[videoStream]
      //     });
      // }
   
   }

   createEffect(()=>{
    if(!socket()) return;
    socket().on('getAns',async(data)=>{
      await handleAnswer(data)
    })
   })

   async function handleAnswer(data){
    const peer = peers.get(data?.id)
    await peer.setRemoteDescription(data.answer)
}

   createEffect(()=>{
    if(!socket()) return;
    socket()?.on('getIce',async(data)=>{
      const peer = peers.get(data?.id)
    await peer.addIceCandidate(data.candidate)
    })
   })

   createEffect(()=>{
    if(!socket()) return;
    socket()?.on('peerLeft',(socketId)=>{
      const peer = peers.get(socketId)
      if(!peer) return;
      peer.close()
      peers.delete(socketId)
      setConnectedPeers(connectedPeers()-1)
    })
   })

   function Stop(){
    peers.forEach((peer,socketId)=>{
      peer.close()
      socket().emit('closeStream',{
        socketId,
        id:socket()?.id
      })
      peers.delete(peer)
    })
    videoStream?.getTracks()?.forEach((track)=>{
      track.stop()
    })
    videoStream = null;
    videoElem?.srcObject?.getTracks().forEach((track)=>{
      track.stop()
    })
    videoElem.srcObject = null;
    videoSender = null;
    audioSender = null;
    setPublishing(false)
    setConnectedPeers(0)
    socket().emit('removePub')
   }

   createEffect(()=>{
    if(!socket()) return;
     socket()?.on('closeStream',async(data)=>{
      const peer = peers.get(data?.id)
      if(!peer) return;
      await peer.close();
      peers.delete(data?.id)
      setConnectedPeers(connectedPeers()-1)
     })
   })

   createEffect(()=>{
    console.log(connectedPeers(),'peers')
   })




  return (
    <div class={styles.App}>
       <div class={styles.videoCont}>
             <video ref={videoElem} muted autoplay></video>
             <h1 class={styles.notPub}>NOT PUBLISHED YET!</h1>
             {connectedPeers()>0&&<span class={styles.conPeers}><i class="fa-solid fa-person"></i> {connectedPeers()}</span>}
       </div>

       <div class={styles.buttons}>
        <button disabled={publishing()} onClick={publishVideo} class={styles.pubVideo}>Publish Video</button>
        <button disabled={publishing()} onClick={publishScreen} class={styles.pubScreen}>Publish Screen</button>
        {publishing()&&<button onClick={Stop} class={styles.stop}>Stop</button>}
       </div>

    </div>
  );
}

export default Publish;