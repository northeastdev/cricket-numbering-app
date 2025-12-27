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
    currentNumberEl.className = "text-8xl font-extrabold text-white transition-all duration-200";
    
    displayRing.classList.remove('border-neon-green', 'shadow-[0_0_30px_rgba(57,255,20,0.3),inset_0_0_20px_rgba(0,0,0,0.5)]');
    displayRing.classList.add('border-text-dim');
    
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
    displayRing.classList.remove('border-neon-green', 'shadow-[0_0_30px_rgba(57,255,20,0.3),inset_0_0_20px_rgba(0,0,0,0.5)]');
    displayRing.classList.add('border-text-dim');
    
    currentNumberEl.classList.remove('animate-pop-in', 'text-neon-green');
    currentNumberEl.classList.add('text-text-dim', 'blur-[2px]', 'text-6xl');

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
        currentNumberEl.classList.remove('text-text-dim', 'blur-[2px]', 'text-6xl');
        currentNumberEl.innerText = finalNumber;
        currentNumberEl.classList.add('animate-pop-in', 'text-neon-green');
        
        displayRing.classList.remove('border-text-dim');
        displayRing.classList.add('border-neon-green', 'shadow-[0_0_30px_rgba(57,255,20,0.3),inset_0_0_20px_rgba(0,0,0,0.5)]');

        if (navigator.vibrate) navigator.vibrate(200);

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

    }, 600);
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
    li.className = 'bg-cricket-card px-2.5 py-1 rounded-md text-sm border border-white/10 flex items-center animate-fade-in';
    
    // Editable Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-text-dim border-b border-dashed border-white/30 mr-[2px] px-1 py-[2px] outline-none cursor-text transition-all focus:bg-white/10 focus:text-white focus:border-neon-green focus:rounded';
    nameSpan.contentEditable = true;
    nameSpan.spellcheck = false;
    nameSpan.innerText = item.name;
    
    // Event Listeners for Edit
    const saveNameChange = () => {
        const newName = nameSpan.innerText.trim() || "Player";
        item.name = newName; // Update data model
        saveState(); // Persist changes
    };

    nameSpan.addEventListener('blur', saveNameChange);
    nameSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nameSpan.blur(); // triggers blur -> saveNameChange
        }
    });

    // Number
    const numSpan = document.createElement('span');
    numSpan.className = 'text-neon-green font-bold ml-[2px]';
    numSpan.textContent = `: ${item.number}`;

    li.appendChild(nameSpan);
    li.appendChild(numSpan);
    
    // Prepend to list (Newest first)
    historyList.insertBefore(li, historyList.firstChild);
}

function resetGame() {
    if(confirm("Start a new innings? Current progress will be lost.")) {
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
        const canvas = document.getElementById("confetti-canvas");
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
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
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#39ff14', '#dc2626', '#ffffff', '#fbbf24'];

    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5
        });
    }

    function animateConfetti() {
        // Stop loop if we went back to setup
        if(setupScreen.classList.contains('flex') === false && gameScreen.classList.contains('flex') === false) {
             // If we are in setup mode, check if setup is active
        }
        
        if(setupScreen.classList.contains('flex')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return; 
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let activeParticles = false;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.y < canvas.height) activeParticles = true;
            else if (p.y >= canvas.height && availableNumbers.length === 0) {
                 // Loop confetti if game is done
                 p.y = -10;
                 activeParticles = true;
            }

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.size, p.size);
            ctx.fill();
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
