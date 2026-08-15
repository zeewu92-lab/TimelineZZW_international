// Firebase 版的雲端同步實作——原本 cloudSync.js 的內容整份搬過來，邏輯完全沒動。
// 之後 cloudSync.js 會變成「調度層」，依環境決定要用這份還是 mainlandSync.js。
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

function userDocRef(uid) {
  return doc(db, 'users', uid, 'data', 'app');
}

// 讀取雲端資料；帳號第一次登入、雲端還沒有資料時回傳 null
export async function loadCloudData(uid) {
  const snap = await getDoc(userDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

// 整包覆蓋寫入雲端（用在登入後決定「以雲端為主」「以本機為主」「合併」之後的最終結果）
export async function saveCloudData(uid, data) {
  await setDoc(userDocRef(uid), { ...data, updatedAt: Date.now() });
}
