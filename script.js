// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, show update prompt if desired
                            console.log('New content available, please refresh.');
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// --- PWA Install Prompt ---
let deferredPrompt;
const installPromptContainer = document.createElement('div');
installPromptContainer.id = 'install-prompt';
installPromptContainer.className = 'install-prompt hidden';
installPromptContainer.innerHTML = `
    <div class="glass rounded-2xl p-4 flex items-center gap-4 shadow-2xl border border-white/10">
        <div class="bg-accent-start/20 p-3 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        </div>
        <div class="flex-1">
            <p class="text-white font-semibold text-sm">Install App</p>
            <p class="text-text-dim text-xs">Add to your home screen</p>
        </div>
        <button id="install-btn" class="bg-gradient-to-r from-accent-start to-accent-mid text-black font-bold py-2 px-4 rounded-xl text-sm">
            Install
        </button>
        <button id="dismiss-install" class="text-text-dim hover:text-white p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    </div>
`;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install prompt after a delay
    setTimeout(() => {
        document.body.appendChild(installPromptContainer);
        installPromptContainer.classList.remove('hidden');
    }, 3000);
});

document.addEventListener('click', (e) => {
    if (e.target.id === 'install-btn') {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
                installPromptContainer.classList.add('hidden');
            });
        }
    }
    if (e.target.id === 'dismiss-install' || e.target.closest('#dismiss-install')) {
        installPromptContainer.classList.add('hidden');
    }
});

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    installPromptContainer.classList.add('hidden');
});

// --- Game State ---
let availableNumbers = [];
let totalPlayers = 0;
let isAnimating = false;
// historyStore is an array of objects: { id: string, name: string, number: int }
let historyStore = []; 

const STORAGE_KEY = 'cricket_draw_state_v2';


// --- DOM Elements ---
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const inputPlayers = document.getElementById('total-players');
const currentNumberEl = document.getElementById('current-number');
const remainingEl = document.getElementById('remaining-count');
const drawBtn = document.getElementById('draw-btn');
const displayRing = document.getElementById('display-ring');
const historyList = document.getElementById('history-list');

// --- Lifecycle ---

window.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    // Auto-select "Total Players" input on focus
    inputPlayers.addEventListener('focus', () => {
        inputPlayers.select();
    });
});

// --- Core Functions ---

function startGame() {
    const count = parseInt(inputPlayers.value);
    if (!count || count < 2) {
        alert("Please enter at least 2 players.");
        return;
    }

    totalPlayers = count;
    
    // Generate array [1, 2, ..., N]
    availableNumbers = Array.from({length: totalPlayers}, (_, i) => i + 1);
    
    // Fisher-Yates Shuffle
    shuffleArray(availableNumbers);

    // Reset Logic
    historyStore = [];
    clearHistoryUI();
    
    currentNumberEl.innerText = "?";
    // Reset classes to base text classes
    currentNumberEl.className = "text-[120px] font-extrabold text-white transition-all duration-300 drop-shadow-2xl";
    
    displayRing.classList.remove('border-accent-start/50', 'shadow-glow-accent', 'scale-[1.05]');
    displayRing.classList.add('border-white/5');
    
    updateRemaining();
    
    // UI Switch
    setupScreen.classList.add('hidden');
    setupScreen.classList.remove('flex');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('flex');
    
    drawBtn.disabled = false;
    drawBtn.innerText = "Get My Number";
    
    clearConfetti();
    saveState(); // Save initial state
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function drawNumber() {
    if (isAnimating || availableNumbers.length === 0) return;

    isAnimating = true;
    drawBtn.disabled = true;
    
    // Reset ring highlight
    displayRing.classList.remove('border-accent-start/50', 'shadow-glow-accent', 'scale-[1.05]');
    displayRing.classList.add('border-white/5');
    
    currentNumberEl.classList.remove('animate-pop-in', 'text-gradient');
    currentNumberEl.classList.add('text-text-dim', 'blur-[4px]', 'scale-75');

    // Slot Machine Animation Effect
    let shuffleInterval = setInterval(() => {
        const randomDisplay = Math.floor(Math.random() * totalPlayers) + 1;
        currentNumberEl.innerText = randomDisplay;
    }, 50);

    // The Reveal
    setTimeout(() => {
        clearInterval(shuffleInterval);
        
        // Pop the actual number
        const finalNumber = availableNumbers.pop();
        
        // UI Updates
        currentNumberEl.classList.remove('text-text-dim', 'blur-[4px]', 'scale-75');
        currentNumberEl.innerText = finalNumber;
        currentNumberEl.classList.add('animate-pop-in', 'text-gradient');
        
        displayRing.classList.remove('border-white/5');
        displayRing.classList.add('border-accent-start/50', 'shadow-glow-accent', 'scale-[1.05]');

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // Add to history store
        const playerIndex = totalPlayers - availableNumbers.length; 
        const defaultName = `P${playerIndex}`;
        
        const historyItem = {
            id: Date.now().toString(), // unique id
            name: defaultName,
            number: finalNumber
        };

        historyStore.push(historyItem);
        
        // Add to UI (prepend)
        renderHistoryItem(historyItem);
        
        updateRemaining();
        saveState(); // Save after draw

        // Check Game Over
        if (availableNumbers.length === 0) {
            drawBtn.innerText = "All Set!";
            startConfetti();
        } else {
            drawBtn.disabled = false;
        }
        
        isAnimating = false;

    }, 400);
}

function updateRemaining() {
    remainingEl.innerText = `${availableNumbers.length} / ${totalPlayers}`;
}

function clearHistoryUI() {
    historyList.innerHTML = '';
}

// Renders a single history item to the top of the list
function renderHistoryItem(item) {
    const li = document.createElement('li');
    li.className = 'bg-white/5 px-4 py-2 rounded-xl text-sm border border-white/10 flex items-center animate-fade-in shadow-sm hover:border-white/20 transition-all';
    
    // Editable Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-text-dim border-b border-dashed border-white/20 mr-1.5 px-1 py-0.5 outline-none cursor-text transition-all focus:bg-white/10 focus:text-white focus:border-accent-mid focus:rounded-md';
    nameSpan.contentEditable = true;
    nameSpan.spellcheck = false;
    nameSpan.innerText = item.name;
    
    // Event Listeners for Edit
    const saveNameChange = () => {
        const newName = nameSpan.innerText.trim() || "Player";
        item.name = newName; // Update data model
        saveState(); // Persist changes
    };

    nameSpan.addEventListener('focus', () => {
        // Use a small timeout to ensure it works across all browsers
        setTimeout(() => {
            const range = document.createRange();
            range.selectNodeContents(nameSpan);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }, 0);
    });

    nameSpan.addEventListener('blur', saveNameChange);
    nameSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nameSpan.blur(); // triggers blur -> saveNameChange
        }
    });

    // Number
    const numSpan = document.createElement('span');
    numSpan.className = 'text-[#fcd34d] font-bold';
    numSpan.textContent = ` #${item.number}`;

    li.appendChild(nameSpan);
    li.appendChild(numSpan);
    
    // Prepend to list (Newest first)
    historyList.insertBefore(li, historyList.firstChild);
}

function resetGame() {
    if(confirm("Are you sure you want to reset the current match?")) {
        // Clear State
        localStorage.removeItem(STORAGE_KEY);
        availableNumbers = [];
        historyStore = [];
        totalPlayers = 0;
        
        // Reset UI
        gameScreen.classList.add('hidden');
        gameScreen.classList.remove('flex');
        setupScreen.classList.remove('hidden');
        setupScreen.classList.add('flex');
        
        // Stop confetti if running
        clearConfetti();
    }
}

// --- Local Storage Logic ---

function saveState() {
    const state = {
        active: gameScreen.classList.contains('flex'),
        totalPlayers: totalPlayers,
        availableNumbers: availableNumbers,
        historyStore: historyStore
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const state = JSON.parse(saved);
        
        if (state.active && state.totalPlayers > 0) {
            // Restore Data
            totalPlayers = state.totalPlayers;
            availableNumbers = state.availableNumbers;
            historyStore = state.historyStore || [];

            // Restore UI
            inputPlayers.value = totalPlayers;
            updateRemaining();
            
            // Restore History List (Iterate normally, renderItem prepends)
            clearHistoryUI();
            historyStore.forEach(item => {
                renderHistoryItem(item);
            });

            // Set Button State
            if (availableNumbers.length === 0) {
                drawBtn.innerText = "All Set!";
                drawBtn.disabled = true;
                startConfetti();
            } else {
                drawBtn.innerText = "Get My Number";
                drawBtn.disabled = false;
            }

            // Switch Screens
            setupScreen.classList.add('hidden');
            setupScreen.classList.remove('flex');
            gameScreen.classList.remove('hidden');
            gameScreen.classList.add('flex');
        }
    } catch (e) {
        console.error("Failed to load state", e);
        localStorage.removeItem(STORAGE_KEY);
    }
}

// --- Simple Confetti Logic (Canvas) ---
function clearConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    if(!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    // Golden theme colors
    const colors = ['#f59e0b', '#fcd34d', '#fef9c3', '#ffffff', '#ef4444'];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 4 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }

    function animateConfetti() {
        // Stop loop if we went back to setup
        if(setupScreen.classList.contains('flex')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return; 
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let activeParticles = false;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            
            if (p.y < canvas.height) activeParticles = true;
            else if (p.y >= canvas.height && availableNumbers.length === 0) {
                 // Loop confetti if game is done
                 p.y = -20;
                 p.x = Math.random() * canvas.width;
                 activeParticles = true;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        });

        requestAnimationFrame(animateConfetti);
    }

    animateConfetti();
}

// Handle Resize for Canvas
window.addEventListener('resize', () => {
    const canvas = document.getElementById("confetti-canvas");
    if(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});
