// Firebase 版的雲端同步實作——原本 cloudSync.js 的內容整份搬過來，邏輯完全沒動。
// 之後 cloudSync.js 會變成「調度層」，依環境決定要用這份還是 mainlandSync.js。
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

function userDocRef(uid) {
  return doc(db, 'users', uid, 'data', 'app');
}

// 相片（albumPhotos）內容量可能很大、而且沒有上限，跟骨架資料（clocks/events 等，體積小、
// 幾乎固定）分開存成獨立的一份文件。這樣做兩個好處：
// 1. 骨架資料幾乎不可能碰到 Firestore 單一文件 1 MiB 的上限，可以放心地整包覆蓋寫入，
//    不會被使用者加了很多相片這件事拖累，導致連事件、時鐘這些小資料都存不進去。
// 2. 相片這份文件即使真的存太大失敗，也只影響相片，不影響骨架資料——呼叫端（App.jsx 的
//    saveCloudDataBestEffort）本來就設計成「整包試一次、失敗就退回只送骨架」，這裡拆成兩份
//    文件之後，「退回只送骨架」不會再需要用 merge、也不會不小心把雲端上次已經存好的相片洗掉。
function userPhotosDocRef(uid) {
  return doc(db, 'users', uid, 'data', 'albumPhotos');
}

// 讀取雲端資料；帳號第一次登入、雲端完全還沒有資料時回傳 null。
// 骨架資料（app 文件）不存在就視為「沒有雲端資料」；相片文件是額外讀取、有就附加到回傳結果的
// albumPhotos 欄位，讀不到（不存在、或讀取失敗）就當作沒有相片，不影響骨架資料本身能不能讀到。
export async function loadCloudData(uid) {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  try {
    const photosSnap = await getDoc(userPhotosDocRef(uid));
    if (photosSnap.exists()) {
      const photosData = photosSnap.data();
      if (photosData && photosData.albumPhotos) data.albumPhotos = photosData.albumPhotos;
    }
  } catch (err) {
    // 相片文件讀取失敗，當作沒有相片即可，不要讓骨架資料也讀不到
  }
  return data;
}

// 整包覆蓋寫入雲端（用在登入後決定「以雲端為主」「以本機為主」「合併」之後的最終結果，
// 也用在平常資料變動時的自動推送）。
// 骨架資料永遠寫進主文件（app）；相片（data.albumPhotos，如果有帶的話）另外整包覆蓋寫進
// 獨立的一份文件（albumPhotos）。兩份文件都是「完整覆蓋」、不用 merge——這樣如果使用者刪掉了
// 某個相冊，下次相片文件成功寫入時就是乾淨的最新狀態，不會有已刪除相冊的舊資料卡在雲端上
// 陰魂不散（Firestore 的 merge 對巢狀物件欄位是逐 key 合併，只送目前有的相冊會導致刪除的相冊
// 永遠留在雲端，所以這裡刻意選擇整包覆蓋而不是 merge)。
// 呼叫端如果這次的 data 沒帶 albumPhotos 欄位（例如相片太大、外層 retry 時決定先不送相片），
// 這裡就完全不去動相片文件，保留它上一次成功寫入的內容。
export async function saveCloudData(uid, data) {
  const { albumPhotos, ...meta } = data;
  await setDoc(userDocRef(uid), { ...meta, updatedAt: Date.now() });
  if (albumPhotos !== undefined) {
    await setDoc(userPhotosDocRef(uid), { albumPhotos, updatedAt: Date.now() });
  }
}

