document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const subjectsContainer = document.getElementById('subjects-container');
    const chaptersContainer = document.getElementById('chapters-container');
    const playerContainer = document.getElementById('player-container');
    const subjectsList = document.getElementById('subjects-list');
    const chaptersList = document.getElementById('chapters-list');
    const backToSubjectsBtn = document.getElementById('back-to-subjects-btn');
    const backToChaptersBtn = document.getElementById('back-to-chapters-btn');
    const audioPlayer = document.getElementById('audio-player');
    const downloadBtn = document.getElementById('download-btn');
    const downloadStatus = document.getElementById('download-status');
    const sadhuBtn = document.getElementById('sadhu-btn');
    const cholitoBtn = document.getElementById('cholito-btn');

    let currentChapter = null;
    let allData = null;
    const CACHE_NAME = 'audio-cache-v1';

    // --- Helper Functions ---
    function createCard(text, onClickHandler) {
        const card = document.createElement('div');
        card.className = 'card';
        card.textContent = text;
        card.onclick = onClickHandler;
        return card;
    }

    // --- Navigation ---
    function showSubjects() {
        subjectsContainer.classList.remove('hidden');
        chaptersContainer.classList.add('hidden');
        playerContainer.classList.add('hidden');
    }

    function showChapters(subjectId) {
        const subject = allData.subjects.find(s => s.id === subjectId);
        document.getElementById('subject-title-chapters').textContent = subject.name;
        chaptersList.innerHTML = '';
        const filteredChapters = allData.chapters.filter(c => c.subject_id === subjectId);
        
        filteredChapters.forEach(chapter => {
            const card = createCard(chapter.name, () => showPlayer(chapter.id));
            chaptersList.appendChild(card);
        });

        subjectsContainer.classList.add('hidden');
        chaptersContainer.classList.remove('hidden');
        playerContainer.classList.add('hidden');
    }

    async function showPlayer(chapterId) {
        currentChapter = allData.chapters.find(c => c.id === chapterId);
        document.getElementById('chapter-title-player').textContent = currentChapter.name;
        
        sadhuBtn.disabled = !currentChapter.sadhu_audio_url;
        cholitoBtn.disabled = !currentChapter.cholito_audio_url;

        let initialVersion = 'sadhu';
        if (!currentChapter.sadhu_audio_url && currentChapter.cholito_audio_url) {
            initialVersion = 'cholito';
        }
        
        await setAudioSource(initialVersion, true); // true = প্রথমবার লোড হচ্ছে
        
        checkDownloadStatus();
        subjectsContainer.classList.add('hidden');
        chaptersContainer.classList.add('hidden');
        playerContainer.classList.remove('hidden');
    }
    
    // উন্নতি: অডিওর প্লেব্যাকের অবস্থান ধরে রাখে
    async function setAudioSource(version, isFirstLoad = false) {
        const url = version === 'sadhu' ? currentChapter.sadhu_audio_url : currentChapter.cholito_audio_url;
        if (!url) {
            if (isFirstLoad) alert('এই অধ্যায়ের জন্য কোনো অডিও ফাইল পাওয়া যায়নি।');
            return;
        }

        const currentTime = isFirstLoad ? 0 : audioPlayer.currentTime;
        const isPaused = audioPlayer.paused;
        
        sadhuBtn.classList.toggle('active', version === 'sadhu');
        cholitoBtn.classList.toggle('active', version === 'cholito');

        const offlineUrl = await getOfflineUrl(url);
        audioPlayer.src = offlineUrl || url;

        audioPlayer.onloadedmetadata = () => {
            audioPlayer.currentTime = currentTime;
            if (!isPaused) {
                audioPlayer.play().catch(e => console.error("Autoplay was prevented:", e));
            }
        };
    }
    
    // --- Data Loading ---
    async function loadData() {
        try {
            // গুরুতর সংশোধন: ক্যাশ-বাস্টিং প্যারামিটার সরানো হয়েছে
            const response = await fetch('database.json');
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            allData = await response.json();
            
            subjectsList.innerHTML = '';
            // উন্নতি: খালি ডেটার জন্য ব্যবস্থা
            if (allData.subjects && allData.subjects.length > 0) {
                allData.subjects.forEach(subject => {
                    const card = createCard(subject.name, () => showChapters(subject.id));
                    subjectsList.appendChild(card);
                });
            } else {
                subjectsList.innerHTML = '<div class="card placeholder">কোনো বিষয় পাওয়া যায়নি।</div>';
            }
        } catch (error) {
            subjectsList.innerHTML = '<div class="card placeholder">ডেটা লোড করা যায়নি। অফলাইনে থাকলে অ্যাপটি পুনরায় চালু করুন।</div>';
            console.error('Failed to load data:', error);
        }
    }

    // --- Offline Functionality ---
    async function downloadAudio() {
        if (!currentChapter) return;
        downloadBtn.disabled = true;
        downloadStatus.textContent = 'ডাউনলোড শুরু হচ্ছে...';
        
        try {
            const cache = await caches.open(CACHE_NAME);
            const urlsToCache = [currentChapter.sadhu_audio_url, currentChapter.cholito_audio_url].filter(Boolean);
            
            await cache.addAll(urlsToCache);
            
            downloadStatus.textContent = 'সফলভাবে অফলাইনে সেভ হয়েছে!';
        } catch (error) {
            downloadStatus.textContent = 'ডাউনলোড ব্যর্থ হয়েছে।';
            downloadBtn.disabled = false;
            console.error('Download failed:', error);
        }
    }
    
    async function getOfflineUrl(url) {
        if (!url || !('caches' in window)) return null;
        try {
            const cache = await caches.open(CACHE_NAME);
            const response = await cache.match(url);
            return response ? response.url : null;
        } catch (error) { 
            console.error("Cache access error:", error);
            return null;
        }
    }

    async function checkDownloadStatus() {
        downloadStatus.textContent = '';
        downloadBtn.disabled = false;
        
        if (!currentChapter) return;

        const urlsToCheck = [currentChapter.sadhu_audio_url, currentChapter.cholito_audio_url].filter(Boolean);
        if (urlsToCheck.length === 0) {
            downloadBtn.disabled = true;
            downloadStatus.textContent = 'ডাউনলোডের জন্য কোনো ফাইল নেই।';
            return;
        }

        let allCached = true;
        for (const url of urlsToCheck) {
            const offlineUrl = await getOfflineUrl(url);
            if (!offlineUrl) {
                allCached = false;
                break;
            }
        }

        if (allCached) {
            downloadStatus.textContent = 'এই অধ্যায়টি অফলাইনে সেভ করা আছে।';
            downloadBtn.disabled = true;
        }
    }
    
    // --- Event Listeners ---
    backToSubjectsBtn.onclick = showSubjects;
    backToChaptersBtn.onclick = () => showChapters(currentChapter.subject_id);
    downloadBtn.onclick = downloadAudio;
    sadhuBtn.onclick = () => setAudioSource('sadhu');
    cholitoBtn.onclick = () => setAudioSource('cholito');

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registration successful:', reg))
                .catch(err => console.error('SW registration failed: ', err));
        });
    }

    loadData();
});
