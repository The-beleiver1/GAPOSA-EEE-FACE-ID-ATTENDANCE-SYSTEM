import { useRef, useState, useCallback } from 'react'

export function useCamera() {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [active,  setActive]  = useState(false)
  const [facing,  setFacing]  = useState('user')
  const [error,   setError]   = useState(null)

  const startCamera = useCallback(async (facingMode = 'user') => {
    setError(null)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
      setFacing(facingMode)
    } catch (err) {
      setError(err.message || 'Camera access denied')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  const switchCamera = useCallback(() => {
    const newFacing = facing === 'user' ? 'environment' : 'user'
    startCamera(newFacing)
  }, [facing, startCamera])

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null
    const canvas = document.createElement('canvas')
    canvas.width  = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  return { videoRef, active, facing, error, startCamera, stopCamera, switchCamera, captureFrame }
}
