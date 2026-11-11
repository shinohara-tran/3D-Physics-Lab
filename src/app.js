import { HandCamera } from './input/hands.js';

const NOTICE = 'Không mở được camera — vẫn dùng được bàn phím và chuột.';

/** Starts the webcam hand tracker; on any failure shows the Vietnamese notice and returns null. */
export async function startCamera(video = document.getElementById('cam'), notice = document.getElementById('notice')) {
  const cam = new HandCamera(video);
  try {
    await cam.start();
    return cam;
  } catch (e) {
    console.warn('Camera unavailable:', e);
    cam.stop();
    notice.textContent = NOTICE;
    notice.hidden = false;
    return null;
  }
}

startCamera();
