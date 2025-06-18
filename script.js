// Profil verileri için yapı
let userProfile = {
  name: localStorage.getItem('profileName') || 'Kullanıcı',
  avatar: localStorage.getItem('profileAvatar') || 'https://randomuser.me/api/portraits/men/32.jpg'
};

let words = JSON.parse(localStorage.getItem('words') || '[]');
let learnedToday = parseInt(localStorage.getItem('learnedToday') || '0');
let dailyGoal = parseInt(localStorage.getItem('dailyGoal') || '10');
let notificationWordCount = parseInt(localStorage.getItem('notificationWordCount') || '1');
let notificationIntervals = new Map();

let quizStats = JSON.parse(localStorage.getItem('quizStats') || '{"total":0,"correct":0}');
let quizData = { arr: [], idx: 0, mode: false };
let audioQuizData = { arr: [], idx: 0 };
let flashcardIndex = 0;
let flashcardShowMeaning = false;

// Profil render fonksiyonu
function renderProfile() {
  document.getElementById('profileName').textContent = userProfile.name;
  document.getElementById('profileAvatar').src = userProfile.avatar;
  document.getElementById('profileStats').textContent = `Toplam kelime: ${words.length}, Öğrenilen: ${words.filter(w=>w.learned).length}`;
  document.getElementById('profileQuizStats').textContent = `Quiz Doğru: ${quizStats.correct || 0}, Toplam Quiz: ${quizStats.total || 0}`;
}

// Ayarlar formunu doldur
function fillSettingsForm() {
  document.getElementById('profileNameInput').value = userProfile.name;
  document.getElementById('profileAvatarInput').value = userProfile.avatar;
  document.getElementById('dailyGoalInput').value = dailyGoal || 10;
  document.getElementById('notificationWordCount').value = notificationWordCount || 1;
}

// Profil ayarlarını kaydet
function saveProfileSettings() {
  const name = document.getElementById('profileNameInput').value.trim();
  const avatar = document.getElementById('profileAvatarInput').value.trim();
  const dailyGoalVal = parseInt(document.getElementById('dailyGoalInput').value);

  if (name) {
    userProfile.name = name;
    localStorage.setItem('profileName', name);
  }
  if (avatar) {
    userProfile.avatar = avatar;
    localStorage.setItem('profileAvatar', avatar);
  }
  if (!isNaN(dailyGoalVal) && dailyGoalVal > 0) {
    dailyGoal = dailyGoalVal;
    localStorage.setItem('dailyGoal', dailyGoalVal);
    updateProgressBar();
  }
  renderProfile();
  showToast('Profil ve ayarlar kaydedildi!', "bg-green-500");
}

// Sayfa açılışında profil ve ayarlar formunu doldur
document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
  fillSettingsForm();
  renderWords();
  showQuizStats();
  hideError();
  updateProgressBar();
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      showError('Uygulama çevrimdışı desteği yüklenemedi.');
    });
  }
});

// Sekme gösterici
function showSection(id) {
  for(const sec of ['profil','kelimeEkle','kelimeListesi','ayarlar','quiz','audioQuiz','flashcard']) {
    const el = document.getElementById(sec);
    if(el) {
      if(sec===id) {
        el.classList.remove('hidden');
        setTimeout(()=>el.classList.add('fade-in'),10);
      } else {
        el.classList.add('hidden');
        el.classList.remove('fade-in');
      }
    }
  }
  if(id==="flashcard" && typeof showFlashcardSection==="function") showFlashcardSection();
  if(id==="audioQuiz" && typeof showAudioQuizSection==="function") showAudioQuizSection();
  if(id==="profil") renderProfile();
  if(id==="ayarlar") fillSettingsForm();
}

// Geri kalan fonksiyonlar (kelime ekle, listele, sil, bildirim, quiz, flashcard vs.)
// Bu bloklarda mevcut script.js'inizdeki işlevlerinizi aşağıda olduğu gibi kullanmaya devam edin:

function addWord() {
  const wordInput = document.getElementById('wordInput');
  const intervalInput = document.getElementById('intervalInput');
  const word = wordInput.value.trim();
  const interval = parseInt(intervalInput.value) * 1000;
  if (!word || isNaN(interval) || interval < 5000) {
    showError('Lütfen bir kelime ve en az 5 saniyelik bir süre girin!');
    return;
  }
  if (isWordExists(word)) {
    showError('Bu kelime zaten listede!');
    return;
  }
  words.push({ word, interval });
  localStorage.setItem('words', JSON.stringify(words));
  renderWords();
  wordInput.value = '';
  intervalInput.value = '';
  learnedToday += 1;
  localStorage.setItem('learnedToday', learnedToday);
  updateProgressBar();
  hideError();
  showToast('Kelime eklendi!');
  badgeBounce();
}

function isWordExists(word) {
  return words.some(w => w.word === word);
}

function renderWords(search = '') {
  // Listeleme ve filtreleme mantığı
  const list = document.getElementById('wordList');
  if (!list) return;
  list.innerHTML = '';
  let filtered = words;
  if (search) {
    const s = search.toLowerCase();
    filtered = words.filter(w => w.word.toLowerCase().includes(s) || (w.meaning && w.meaning.toLowerCase().includes(s)));
  }
  filtered.forEach((w,i) => {
    const li = document.createElement('li');
    li.className = "flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded shadow";
    li.innerHTML = `
      <span class="font-bold">${w.word}</span>
      ${w.meaning ? `<span class="opacity-80">: ${w.meaning}</span>` : ''}
      <button class="btn btn-xs" onclick="toggleFavorite(${i})">${w.favorite ? '★' : '☆'}</button>
      <button class="btn btn-xs" onclick="toggleLearned(${i})">${w.learned ? '✔️' : '⏳'}</button>
      <button class="btn btn-xs btn-danger" onclick="removeWord(${i})">Sil</button>
    `;
    list.appendChild(li);
  });
  document.getElementById('listBadge').textContent = filtered.length;
  renderProfile();
}

function filterWords() {
  renderWords(document.getElementById('wordSearch').value);
}

function toggleFavorite(idx) {
  words[idx].favorite = !words[idx].favorite;
  localStorage.setItem('words', JSON.stringify(words));
  renderWords(document.getElementById('wordSearch').value);
  showToast(words[idx].favorite ? "Favorilere eklendi!" : "Favoriden çıkarıldı!", "bg-yellow-500");
}
function toggleLearned(idx) {
  words[idx].learned = !words[idx].learned;
  localStorage.setItem('words', JSON.stringify(words));
  renderWords(document.getElementById('wordSearch').value);
  showToast(words[idx].learned ? "Öğrenildi olarak işaretlendi!" : "Öğrenildi kaldırıldı!", "bg-green-600");
}

function removeWord(idx) {
  words.splice(idx,1);
  localStorage.setItem('words', JSON.stringify(words));
  renderWords(document.getElementById('wordSearch').value);
  showToast('Kelime silindi!', "bg-red-500");
  badgeBounce();
  updateProgressBar();
}

function clearAllWords() {
  words = [];
  localStorage.setItem('words', JSON.stringify(words));
  renderWords();
  showToast('Tüm kelimeler silindi!', "bg-red-500");
  badgeBounce();
  updateProgressBar();
}

function badgeBounce() {
  const badge = document.getElementById('listBadge');
  if (badge) {
    badge.classList.add('animate-bounce');
    setTimeout(()=>badge.classList.remove('animate-bounce'), 300);
  }
}

function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) {
    showError("Bir dosya seçmelisiniz.");
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const lines = e.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      addWordsBatch(lines);
    };
    reader.readAsText(file);
  } else if (ext === 'json') {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const json = JSON.parse(e.target.result);
        let kelimeler = [];
        if (Array.isArray(json)) {
          kelimeler = kelimelerFromArray(json);
        } else {
          Object.keys(json).forEach(mainKey => {
            const val = json[mainKey];
            if (Array.isArray(val)) {
              kelimeler = kelimeler.concat(kelimelerFromArray(val));
            }
          });
        }
        if (kelimeler.length === 0) {
          showError("JSON dosya formatı geçersiz veya uygun kelime bulunamadı.");
        } else {
          addWordsBatch(kelimeler);
        }
      } catch (err) {
        showError("JSON dosyası okunamadı.");
      }
    };
    reader.readAsText(file);
  } else {
    showError("Desteklenmeyen dosya tipi.");
  }
}

function kelimelerFromArray(arr) {
  const result = [];
  arr.forEach(obj => {
    if (typeof obj === "string") {
      result.push(obj);
    } else if (typeof obj === "object" && obj !== null) {
      let word = obj.kelime || obj.phrase || obj.isim || obj.osmanlica || obj.tekil || obj["İsm-i Fâil"] || obj.word || obj["çoğul"];
      let meaning = obj.anlam || obj.meaning || obj.turkce || obj.masdar || obj["Masdar"];
      if (word) {
        result.push({ word, meaning });
      } else {
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === "string") {
            result.push({ word: obj[key] });
          }
        });
      }
    }
  });
  return result;
}

function addWordsBatch(kelimeler) {
  let newWords = 0;
  kelimeler.forEach(kelime => {
    if (typeof kelime === "string") {
      let text = kelime.trim();
      if (text.length < 2) return;
      if (!isWordExists(text)) {
        words.push({ word: text, interval: 10000 });
        newWords++;
      }
    } else if (typeof kelime === "object" && kelime !== null) {
      let text = kelime.word ? kelime.word.trim() : "";
      let meaning = kelime.meaning ? kelime.meaning.trim() : "";
      if (text.length < 2) return;
      if (!isWordExists(text)) {
        let entry = { word: text, interval: 10000 };
        if (meaning) entry.meaning = meaning;
        words.push(entry);
        newWords++;
      }
    }
  });
  localStorage.setItem('words', JSON.stringify(words));
  renderWords();
  showToast(`${newWords} yeni kelime eklendi!`);
  badgeBounce();
  updateProgressBar();
}

function exportWordsAsJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "kelimeler.json");
  document.body.appendChild(dlAnchorElem);
  dlAnchorElem.click();
  document.body.removeChild(dlAnchorElem);
  showToast('JSON dışa aktarıldı!', "bg-blue-500");
}

// Bildirim işlemleri
function updateNotifications() {
  const notificationWordCountInput = document.getElementById('notificationWordCount');
  const newCount = parseInt(notificationWordCountInput.value) || 0;
  if (notificationWordCountInput.value && (isNaN(newCount) || newCount < 1)) {
    showError('Lütfen geçerli bir bildirim kelime sayısı girin!');
    return;
  }
  if (words.length === 0) {
    showError('Önce kelime yükleyin!');
    return;
  }
  notificationWordCount = newCount;
  localStorage.setItem('notificationWordCount', notificationWordCount);
  const selectedWords = getSelectedItems(words, notificationWordCount, 'random');
  startNotifications(selectedWords);
  hideError();
  showToast('Bildirimler başlatıldı!');
}

function stopAllNotifications() {
  notificationIntervals.forEach((intervalId) => clearInterval(intervalId));
  notificationIntervals.clear();
  showToast('Bildirimler durduruldu!', "bg-yellow-500");
}

function showNotification(word, meaning, interval) {
  return setInterval(() => {
    let body = meaning ? `${word}: ${meaning}` : word;
    new Notification('Kelime Hatırlatıcı', {
      body: body,
      icon: 'https://via.placeholder.com/32'
    });
  }, interval);
}

function startNotifications(wordList) {
  stopAllNotifications();
  wordList.forEach(wordObj => {
    if (!('Notification' in window)) {
      alert('Tarayıcınız bildirimleri desteklemiyor!');
      return;
    }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const intervalId = showNotification(wordObj.word, wordObj.meaning, wordObj.interval);
          notificationIntervals.set(wordObj.word, intervalId);
        } else {
          alert('Bildirim izni verilmedi, alert kullanılacak.');
          const intervalId = setInterval(() => alert(`Hatırlatma: ${wordObj.word}${wordObj.meaning ? ' - ' + wordObj.meaning : ''}`), wordObj.interval);
          notificationIntervals.set(wordObj.word, intervalId);
        }
      });
    } else {
      const intervalId = showNotification(wordObj.word, wordObj.meaning, wordObj.interval);
      notificationIntervals.set(wordObj.word, intervalId);
    }
  });
}

function getSelectedItems(array, count, method) {
  if (!count || count >= array.length) return array;
  if (method === 'first') return array.slice(0, count);
  if (method === 'last')  return array.slice(-count);
  const shuffled = array.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Progress bar ve hedef
function updateProgressBar() {
  learnedToday = Math.min(learnedToday, dailyGoal);
  const percent = Math.min(100, Math.round(100*learnedToday/dailyGoal));
  document.getElementById('progressBar').style.width = percent + "%";
  document.getElementById('progressText').textContent = `${learnedToday}/${dailyGoal}`;
}
function resetProgress() {
  learnedToday = 0;
  localStorage.setItem('learnedToday', learnedToday);
  updateProgressBar();
}

// Quiz ve flashcard fonksiyonlarınız burada devam edebilir (mevcut script.js'inizde olduğu gibi)

// ... Quiz, Audio Quiz ve Flashcard işlemleri (startQuiz, showQuizStats, showQuizQuestion, vb.) ...

// Toast ve hata mesajları
function showToast(msg, cls="bg-green-500") {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `fixed right-4 bottom-4 text-white px-4 py-3 rounded shadow-lg opacity-100 pointer-events-auto transition z-50 ${cls}`;
  setTimeout(()=>toast.classList.add('opacity-0'),1800);
}
function showError(msg) {
  const err = document.getElementById('error');
  err.textContent = msg;
  err.classList.remove('hidden');
}
function hideError() {
  document.getElementById('error').classList.add('hidden');
}

// ... Diğer yardımcı fonksiyonlar ve mevcut script.js'inizdeki kodlarınız aynı şekilde kullanılabilir ...
