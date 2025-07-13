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
            const card = document.createElement('div');
            card.className = 'card';
            card.textContent = chapter.name;
            card.onclick = () => showPlayer(chapter.id);
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

        if (currentChapter.sadhu_audio_url) {
            await setAudioSource('sadhu');
        } else if (currentChapter.cholito_audio_url) {
            await setAudioSource('cholito');
        } else {
            audioPlayer.src = '';
            alert('এই অধ্যায়ের জন্য কোনো অডিও ফাইল পাওয়া যায়নি।');
        }
        
        checkDownloadStatus();
        subjectsContainer.classList.add('hidden');
        chaptersContainer.classList.add('hidden');
        playerContainer.classList.remove('hidden');
    }
    
    async function setAudioSource(version) {
        const url = version === 'sadhu' ? currentChapter.sadhu_audio_url : currentChapter.cholito_audio_url;
        
        sadhuBtn.classList.toggle('active', version === 'sadhu');
        cholitoBtn.classList.toggle('active', version === 'cholito');

        const offlineUrl = await getOfflineUrl(url);
        audioPlayer.src = offlineUrl || url;
    }
    
    // --- Data Loading ---
    async function loadData() {
        try {
            const response = await fetch(`database.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Network response was not ok');
            allData = await response.json();
            
            subjectsList.innerHTML = '';
            allData.subjects.forEach(subject => {
                const card = document.createElement('div');
                card.className = 'card';
                card.textContent = subject.name;
                card.onclick = () => showChapters(subject.id);
                subjectsList.appendChild(card);
            });
        } catch (error) {
            subjectsList.innerHTML = '<div class="card placeholder">ডেটা লোড করা যায়নি। ইন্টারনেট সংযোগ চেক করুন।</div>';
            console.error('Failed to load data:', error);
        }
    }

    // --- Offline Functionality ---
    const CACHE_NAME = 'audio-cache-v1';

    async function downloadAudio() {
        if (!currentChapter) return;
        downloadStatus.textContent = 'ডাউনলোড শুরু হচ্ছে...';
        try {
            const cache = await caches.open(CACHE_NAME);
            if (currentChapter.sadhu_audio_url) await cache.add(currentChapter.sadhu_audio_url);
            if (currentChapter.cholito_audio_url) await cache.add(currentChapter.cholito_audio_url);
            downloadStatus.textContent = 'সফলভাবে অফলাইনে সেভ হয়েছে!';
            downloadBtn.disabled = true;
        } catch (error) {
            downloadStatus.textContent = 'ডাউনলোড ব্যর্থ হয়েছে।';
            console.error('Download failed:', error);
        }
    }
    
    async function getOfflineUrl(url) {
        if (!url || !('caches' in window)) return null;
        try {
            const cache = await caches.open(CACHE_NAME);
            const response = await cache.match(url);
            return response ? response.url : null;
        } catch (error) { return null; }
    }

    async function checkDownloadStatus() {
        downloadStatus.textContent = '';
        downloadBtn.disabled = false;
        
        if (!currentChapter) return;
        const sadhuOffline = await getOfflineUrl(currentChapter.sadhu_audio_url);
        const cholitoOffline = await getOfflineUrl(currentChapter.cholito_audio_url);

        if (sadhuOffline || cholitoOffline) {
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
            navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed: ', err));
        });
    }

    loadData();
});