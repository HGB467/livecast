import styles from '../Stream.module.css';
import {io} from 'socket.io-client'
import { createEffect, createSignal, onMount } from 'solid-js';
import toast, { Toaster } from 'solid-toast';

function Stream() {

    const[socket,setSocket] = createSignal()
    const[subscribed,setSubscribed]= createSignal(false)

    let videoElem;
    let publisher;
    let peer;
    

    onMount(()=>{
        setSocket(io('https://melodious-efficient-oatmeal.glitch.me'))
    })

    createEffect(()=>{
        if(!socket()) return;
        socket()?.on('newPub',()=>{
        toast.success("New Publisher has Arrived. Click on Subscribe to Consume their Stream")
        })
    })

    const Subscribe=async()=>{
        if(subscribed()){
         await peer.close()
         socket().emit('closeStream',{
            socketId:publisher,
            id:socket()?.id
         })
         peer = null;
         publisher = null;
         videoElem?.srcObject?.getTracks()?.forEach((track)=>{
           track.stop()
         })
         videoElem.srcObject = null;
         setSubscribed(false)
        }
        else{
            socket().emit('getPublisher');
        }
    }

    createEffect(()=>{
        if(!socket()) return;
        socket()?.on('getPublisher',async(data)=>{
         if(data){
           publisher = data;
           socket().emit('startPeerCon',{socketId:publisher,id:socket()?.id})
         }
         else{
            alert("No Publisher Found!")
         }
        })
    })

    createEffect(()=>{
        if(!socket()) return;
        socket()?.on('getOffer',async(data)=>{
         await sendAnswer(data)
        })
      })

      async function sendAnswer(data){
        peerConnection()
        await peer.setRemoteDescription(data.offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket().emit('getAns',{
            socketId:data?.id,
            answer:answer,
            id:socket()?.id
        })
    }
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

    function peerConnection(){
        peer = new RTCPeerConnection(configuration)
   
       
        peer.onicecandidate = (event)=>{
            if(event.candidate){
                socket().emit('getIce',{
                    socketId:publisher,
                    candidate:event.candidate,
                    id:socket()?.id
                })
            }
           }
   
       peer.onconnectionstatechange= async(e)=>{
               if(e.currentTarget?.connectionState==='failed' || e.currentTarget?.connectionState==='disconnected'){
                if(!peer) return;
                await peer.close()
                peer = null;
                publisher = null;
                videoElem?.srcObject?.getTracks()?.forEach((track)=>{
                  track.stop()
                })
                videoElem.srcObject = null;
                setSubscribed(false)
              }

       }


     peer.ontrack = (e)=>{
        videoElem.srcObject = e.streams[0];
        setSubscribed(true)
     };
   
   }


createEffect(()=>{
    if(!socket()) return;
    socket()?.on('getIce',async(data)=>{
    await peer.addIceCandidate(data.candidate)
    })
   })

createEffect(()=>{
    if(!socket()) return;
    socket()?.on('closeStream',async(data)=>{
        if(!peer) return;
        await peer.close()
        peer = null;
        publisher = null;
        videoElem?.srcObject?.getTracks()?.forEach((track)=>{
          track.stop()
        })
        videoElem.srcObject = null;
        setSubscribed(false)
        toast.error("Stream Ended")
    })
})

  createEffect(()=>{
    if(!socket()) return;
    socket()?.on('peerLeft',async(socketId)=>{
      if(socketId===publisher){
        if(!peer) return;
        await peer.close()
        peer = null;
        publisher = null;
        videoElem?.srcObject?.getTracks()?.forEach((track)=>{
          track.stop()
        })
        videoElem.srcObject = null;
        setSubscribed(false)
        toast.error("Stream Ended")
      }
    })
  })




  return (
    <div class={styles.App}>
       <Toaster position='top-center'/>
       <div class={styles.videoCont}>
       <h1 class={styles.notSub}>NOT SUBSCRIBED YET!</h1>
       <video ref={videoElem} autoplay></video>
       </div>

       <div class={styles.buttons}>
        <button onClick={Subscribe} class={styles.subVideo}>{subscribed()?'Unsubscribe':'Subscribe'}</button>
       </div>

    </div>
  );
}

export default Stream;