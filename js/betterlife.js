import { auth } from './firebase-config.js';

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function isUserDataComplete(userId) {
    // Check if all required data exists in localStorage
    const physiqueData = localStorage.getItem(`physique_${userId}`);
    const nameData = localStorage.getItem(`name_${userId}`);
    const birthData = localStorage.getItem(`birth_${userId}`);
    const avatarData = localStorage.getItem(`avatar_${userId}`);

    return physiqueData && nameData && birthData && avatarData;
}

document.addEventListener('DOMContentLoaded', () => {
    const reloadButton = document.getElementById('reload-button');
    reloadButton.addEventListener('click', () => {
        window.location.reload();
    });

    // Initialize theme from localStorage
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const userData = {
        isQuestionnaireDone: false
    };

    // Modify the saveUserWorkout function to check for duplicates
    function saveUserWorkout(workout, category) {
        const userId = auth.currentUser.uid;
        let userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        // Check if workout already exists
        if (userWorkouts.some(w => w.name === workout)) {
            return false; // Workout already exists
        }
        
        userWorkouts.push({
            name: workout,
            type: category,
            id: Date.now() // Use timestamp as unique ID
        });
        
        localStorage.setItem(`workouts_${userId}`, JSON.stringify(userWorkouts));
        updateWorkoutsList();
        return true; // Workout added successfully
    }

    function deleteUserWorkout(workoutId) {
        const userId = auth.currentUser.uid;
        let userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        userWorkouts = userWorkouts.filter(workout => workout.id !== workoutId);
        
        localStorage.setItem(`workouts_${userId}`, JSON.stringify(userWorkouts));
        updateWorkoutsList();
    }

    function updateWorkoutsList() {
        const userId = auth.currentUser.uid;
        const workoutsContainer = document.querySelector('.workouts-container');
        const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        workoutsContainer.innerHTML = ''; // Clear existing workouts
        
        userWorkouts.forEach((workout, index) => {
            const workoutElement = document.createElement('div');
            workoutElement.className = 'workout-entry';
            workoutElement.style.animationDelay = `${index * 0.1}s`;
            
            workoutElement.innerHTML = `
                <div class="workout-info">
                    <div class="workout-name">${workout.name}</div>
                    <div class="workout-type">${workout.type}</div>
                </div>
                <button class="delete-workout" data-id="${workout.id}">
                    <img src="images/trash.png" alt="Delete">
                </button>
            `;
            
            workoutsContainer.appendChild(workoutElement);
        });

        // Add delete handlers
        document.querySelectorAll('.delete-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workoutId = parseInt(e.currentTarget.dataset.id);
                // Add delete animation
                const workoutEntry = e.currentTarget.closest('.workout-entry');
                workoutEntry.style.animation = 'slideOut 0.3s ease-out forwards';
                
                setTimeout(() => {
                    deleteUserWorkout(workoutId);
                }, 300);
            });
        });
    }

    // Check auth state and questionnaire status
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Check if all user data is complete
        if (!isUserDataComplete(user.uid)) {
            // Show questionnaire and disabled overlay
            document.body.classList.add('show-questionnaire');
            document.getElementById('disabled-overlay').style.display = 'block';
            document.getElementById('questionnaire-overlay').style.display = 'flex';
        } else {
            // Hide questionnaire and disabled overlay
            document.body.classList.remove('show-questionnaire');
            document.getElementById('disabled-overlay').style.display = 'none';
            document.getElementById('questionnaire-overlay').style.display = 'none';
            
            // Mark questionnaire as completed
            localStorage.setItem(`questionnaire_completed_${user.uid}`, 'true');
        }

        // Get stored name data
        const nameData = JSON.parse(localStorage.getItem(`name_${user.uid}`) || '{}');
        const firstName = nameData.firstName;
        
        // Use first name if available, otherwise fallback to email
        const displayName = firstName || user.email.split('@')[0];
        const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        const welcomeMessage = document.getElementById('welcome-message');
        welcomeMessage.textContent = `Welcome, ${capitalizedName}!`;
        updateAccountButtonImage();
        updateInfoCards();
    });

    // Sidebar functionality
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    menuButton.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    function toggleSidebar() {
        // If right sidebar is open, close it first
        if (rightSidebar.classList.contains('active')) {
            rightSidebar.classList.remove('active');
            overlay.classList.remove('active-right');
        }
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const sections = document.querySelectorAll('.section-content');

    function switchSection(sectionId) {
        // Hide all sections first
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show the selected section
        const targetSection = document.querySelector(`.section-content[data-section="${sectionId}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update button states
        sidebarButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            }
        });

        // Close sidebar and overlay
        sidebar.classList.remove('active');
        overlay.classList.remove('active');

        if (sectionId === 'schedule') {
            updateScheduleDisplay();
        } else if (sectionId === 'diet') {
            updateDietSection();
        } else if (sectionId === 'measurements') {
            updateMeasurementsList();
        } else if (sectionId === 'pictures') {
            updatePicturesGrid();
        } else if (sectionId === 'settings') {
            // Initialize settings section if needed
            initializeSettings();
        }
    }

    // Add click handlers for sidebar buttons
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            switchSection(sectionId);
        });
    });

    // Initialize home section as active
    switchSection('home');

    const physiqueForm = document.getElementById('physique-form');
    const nameSection = document.querySelector('.name-section');
    const physiqueSection = document.querySelector('.physique-section');

    // Rename this section switching function to avoid conflicts
    function switchQuestionnaireSection(fromSection, toSection, direction = 'forward') {
        const fadeOut = direction === 'forward' ? 'fadeOutLeft' : 'fadeOutRight';
        const fadeIn = direction === 'forward' ? 'fadeInRight' : 'fadeInLeft';
        
        fromSection.style.animation = `${fadeOut} 0.3s forwards`;
        setTimeout(() => {
            fromSection.style.display = 'none';
            toSection.style.display = 'block';
            toSection.style.animation = `${fadeIn} 0.3s forwards`;
        }, 300);
    }

    physiqueForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const height = document.getElementById('height');
        const weight = document.getElementById('weight');
        const metabolicRate = document.getElementById('metabolic-rate');
        let isValid = true;

        // Clear previous errors
        [height, weight, metabolicRate].forEach(input => input.classList.remove('error'));

        if (height.value < 100 || height.value > 250) {
            height.classList.add('error');
            isValid = false;
        }

        if (weight.value < 30 || weight.value > 300) {
            weight.classList.add('error');
            isValid = false;
        }

        if (metabolicRate.value < 800 || metabolicRate.value > 4000) {
            metabolicRate.classList.add('error');
            isValid = false;
        }

        if (!isValid) return;

        // Save physique data
        const userId = auth.currentUser.uid;
        const physiqueData = {
            height: parseFloat(height.value),
            weight: parseFloat(weight.value),
            metabolicRate: parseFloat(metabolicRate.value)
        };
        
        localStorage.setItem(`physique_${userId}`, JSON.stringify(physiqueData));
        
        // Transition to name section
        switchQuestionnaireSection(physiqueSection, nameSection, 'forward');
    });

    // Handle back button
    document.querySelector('.back-btn').addEventListener('click', () => {
        switchQuestionnaireSection(nameSection, physiqueSection, 'backward');
    });

    // Add necessary animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOutLeft {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(-10%);
            }
        }
        @keyframes fadeOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(10%);
            }
        }
        @keyframes fadeInRight {
            from {
                opacity: 0;
                transform: translateX(10%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes fadeInLeft {
            from {
                opacity: 0;
                transform: translateX(-10%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Handle name form submission
    const nameForm = document.getElementById('name-form');
    const birthSection = document.querySelector('.birth-section');
    const birthForm = document.getElementById('birth-form');
    
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const firstName = document.getElementById('first-name').value;
        const secondName = document.getElementById('second-name').value;
        const lastName = document.getElementById('last-name').value;

        const userId = auth.currentUser.uid;
        const nameData = {
            firstName,
            secondName,
            lastName,
        };

        localStorage.setItem(`name_${userId}`, JSON.stringify(nameData));

        // Transition to birth section instead of completing questionnaire
        switchQuestionnaireSection(nameSection, birthSection, 'forward');
    });

    // Handle birth form validation and submission
    birthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const year = parseInt(document.getElementById('birth-year').value);
        const month = parseInt(document.getElementById('birth-month').value);
        const day = parseInt(document.getElementById('birth-day').value);
        
        const currentYear = new Date().getFullYear();
        let isValid = true;

        if (year < 1920 || year > currentYear) {
            document.getElementById('birth-year').classList.add('error');
            isValid = false;
        }

        if (day < 1 || day > 31) {
            document.getElementById('birth-day').classList.add('error');
            isValid = false;
        }

        if (!isValid) return;

        const userId = auth.currentUser.uid;
        const birthData = {
            year,
            month,
            day
        };

        localStorage.setItem(`birth_${userId}`, JSON.stringify(birthData));
        
        // Transition to avatar section instead of completing questionnaire
        switchQuestionnaireSection(birthSection, avatarSection, 'forward');
        
        // Update subtitle for last section
        document.querySelector('.subtitle').textContent = 'Last One';
    });

    // Handle avatar form
    const avatarSection = document.querySelector('.avatar-section');
    const avatarForm = document.getElementById('avatar-form');
    const profileUpload = document.getElementById('profile-upload');
    const profilePreview = document.getElementById('profile-preview');

    profileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    avatarForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = auth.currentUser.uid;
        const avatarData = {
            nickname: document.getElementById('nickname').value,
            gender: document.getElementById('gender').value,
            profilePicture: profilePreview.src
        };

        localStorage.setItem(`avatar_${userId}`, JSON.stringify(avatarData));
        updateAccountButtonImage();

        // Add closing animation
        const questionnaireContainer = document.querySelector('.questionnaire-container');
        questionnaireContainer.style.animation = 'slideDown 0.5s ease-out forwards';
        
        // Complete questionnaire with delay for animation
        setTimeout(() => {
            completeQuestionnaire();
        }, 500);
    });

    // Update back button handler to include avatar section
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.closest('.avatar-section')) {
                switchQuestionnaireSection(avatarSection, birthSection, 'backward');
                // Reset subtitle
                document.querySelector('.subtitle').textContent = 'Almost There...';
            } else if (btn.closest('.birth-section')) {
                switchQuestionnaireSection(birthSection, nameSection, 'backward');
            } else if (btn.closest('.name-section')) {
                switchQuestionnaireSection(nameSection, physiqueSection, 'backward');
            }
        });
    });

    // Add closing animation keyframe
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideDown {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(50px);
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Function to complete questionnaire
    function completeQuestionnaire() {
        userData.isQuestionnaireDone = true;
        const userId = auth.currentUser.uid;
        localStorage.setItem(`questionnaire_completed_${userId}`, 'true');
        
        document.getElementById('disabled-overlay').style.display = 'none';
        document.getElementById('questionnaire-overlay').style.display = 'none';
        
        // Show selection area with animation and update cards immediately
        const selectionArea = document.getElementById('selection-area');
        const infoCardsContainer = document.querySelector('.info-cards-container');
        
        selectionArea.classList.remove('hide-selection');
        infoCardsContainer.style.display = 'grid';
        infoCardsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        infoCardsContainer.style.gap = '2rem';
        infoCardsContainer.style.padding = '1rem';
        
        // Update cards immediately
        updateInfoCards();

        // Update cards after a small delay to ensure smooth transition
        setTimeout(() => {
            updateInfoCards();
        }, 300);
    }

    // Account button and right sidebar functionality
    const accountButton = document.getElementById('account-button');
    const accountButtonImage = document.getElementById('account-button-image');
    const rightSidebar = document.getElementById('right-sidebar');
    
    // Update account button image if profile picture exists
    function updateAccountButtonImage() {
        const userId = auth.currentUser?.uid;
        if (userId) {
            const avatarData = JSON.parse(localStorage.getItem(`avatar_${userId}`) || '{}');
            if (avatarData.profilePicture) {
                accountButtonImage.src = avatarData.profilePicture;
            }
        }
    }

    // Call this after auth state changes and after avatar form submission
    auth.onAuthStateChanged((user) => {
        updateAccountButtonImage();
    });

    accountButton.addEventListener('click', toggleRightSidebar);

    function toggleRightSidebar() {
        // If left sidebar is open, close it first
        if (sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
        rightSidebar.classList.toggle('active');
        overlay.classList.toggle('active-right');
    }

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        rightSidebar.classList.remove('active');
        overlay.classList.remove('active');
        overlay.classList.remove('active-right');
    });

    // Update avatar form submit handler to also update account button image
    avatarForm.addEventListener('submit', async (e) => {
        updateAccountButtonImage();
    });

    // Password toggle handler
    document.addEventListener('click', (e) => {
        if (e.target.closest('.toggle-password')) {
            const btn = e.target.closest('.toggle-password');
            const passwordText = btn.parentElement.querySelector('.password-text');
            const isHidden = passwordText.textContent === '••••••••';
            
            if (isHidden && passwordText.dataset.password) {
                passwordText.textContent = passwordText.dataset.password;
                btn.querySelector('img').style.opacity = '0.5';
            } else {
                passwordText.textContent = '••••••••';
                btn.querySelector('img').style.opacity = '1';
            }
        }
    });

    // Add workout button handler
    const addWorkoutBtn = document.getElementById('add-workout-btn');
    let isBottomBarOpen = false;

    addWorkoutBtn.addEventListener('click', () => {
        const workoutSelectionOverlay = document.getElementById('workout-selection-overlay');
        workoutSelectionOverlay.classList.add('active');
    });

    // Close workout selection when clicking outside
    document.getElementById('workout-selection-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'workout-selection-overlay') {
            e.target.classList.remove('active');
        }
    });

    // Handle workout search
    const workoutSearch = document.getElementById('workout-search');
    workoutSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterWorkouts(searchTerm);
    });

    function filterWorkouts(searchTerm) {
        const workoutItems = document.querySelectorAll('.workout-item');
        
        workoutItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });

        // Show/hide categories based on whether they have visible items
        document.querySelectorAll('.workout-category').forEach(category => {
            const hasVisibleItems = Array.from(category.querySelectorAll('.workout-item'))
                .some(item => !item.classList.contains('hidden'));
            category.style.display = hasVisibleItems ? 'block' : 'none';
        });
    }

    // Workout data structure
    const workoutCategories = {
        'Chest Exercises': {
            color: 'brown',
            exercises: ['Standard Push-Ups', 'Wide Push-Ups', 'Diamond Push-Ups', 'Decline Push-Ups', 'Incline Push-Ups', 
                       'Archer Push-Ups', 'Clap Push-Ups', 'Plyo Push-Ups', 'Hindu Push-Ups', 'One-Arm Push-Ups', 
                       'Chest Dips', 'Slow Push-Ups', 'Explosive Push-Ups', 'Sphinx Push-Ups', 'Resistance Band Chest Press']
        },
        'Arm Exercises': {
            color: 'orange',
            exercises: ['Triceps Dips', 'Close-Grip Push-Ups', 'Isometric Arm Holds', 'Arm Circles', 'Towel Curls',
                       'Wall Push-Ups', 'Bodyweight Bicep Curl', 'Static Arm Squeeze', 'Negative Push-Ups', 'Towel Triceps Extensions']
        },
        'Shoulder Exercises': {
            color: 'yellow',
            exercises: ['Pike Push-Ups', 'Shoulder Taps', 'Elevated Pike Push-Ups', 'Wall Walks', 'Handstand Holds',
                       'Handstand Push-Ups', 'Arm Raises', 'Wall Angels', 'Reverse Plank Shoulder Taps', 'Scapular Push-Ups']
        },
        'Back Exercises': {
            color: 'green',
            exercises: ['Superman Hold', 'Superman Raises', 'Reverse Snow Angels', 'Prone Y-W-T Raises', 'Doorframe Rows',
                       'Towel Rows', 'Wall Pulls', 'Glute Bridges', 'Hip Thrusts', 'Table Rows']
        },
        'Abs Workouts': {
            color: 'blue',
            exercises: ['Crunches', 'Sit-Ups', 'Leg Raises', 'Flutter Kicks', 'Scissor Kicks', 'Bicycle Crunches',
                       'Russian Twists', 'V-Ups', 'Plank', 'Side Plank', 'Mountain Climbers', 'Plank Shoulder Taps',
                       'Plank to Push-Up', 'Hollow Body Hold', 'Heel Touches']
        },
        'Sit-Up Variations': {
            color: 'purple',
            exercises: ['Standard Sit-Ups', 'Decline Sit-Ups', 'Oblique Sit-Ups', 'Weighted Sit-Ups', 'Cross Sit-Ups',
                       'Butterfly Sit-Ups', 'Jackknife Sit-Ups', 'V-Sit Twists', 'Sit-Up to Stand', 'Sit-Up with Punches']
        },
        'Push-Up Variations': {
            color: 'black',
            exercises: ['Standard Push-Ups', 'Wide Push-Ups', 'Diamond Push-Ups', 'Spiderman Push-Ups', 'Staggered Push-Ups',
                       'T Push-Ups', 'Grasshopper Push-Ups', 'Cross-Body Push-Ups', 'Uneven Push-Ups', 'Push-Up to Pike']
        },
        'Lunge Variations': {
            color: 'red',
            exercises: ['Forward Lunges', 'Reverse Lunges', 'Walking Lunges', 'Jumping Lunges', 'Lateral Lunges',
                       'Curtsy Lunges', 'Bulgarian Split Squats', 'Step-Ups', 'Lunge Pulses', 'Wall-Supported Static Lunges']
        },
        'Full Body Workouts': {
            color: 'white',
            exercises: ['Burpees', 'High Knees', 'Jump Squats', 'Squat to Front Kick', 'Wall Sit',
                       'Bear Crawl', 'Crab Walk', 'Plank Jacks', 'Standing Long Jump', 'Skater Jumps']
        },
        'Leg Workouts': {
            color: 'brown',
            exercises: ['Squats', 'Narrow-Stance Squats', 'Sumo Squats', 'Jumping Squats', 'Pistol Squats',
                       'Assisted Pistol Squats', 'Wall Sits', 'Squat Pulses', 'Calf Raises', 'Single-Leg Calf Raises',
                       'Glute Bridge March', 'Glute Bridge with Leg Raise', 'Donkey Kicks', 'Fire Hydrants',
                       'Standing Hamstring Curls', 'Step-Back Lunges', 'Skater Lunges', 'Duck Walks', 'Frog Jumps', 'Wall Sit Calf Raises']
        },
        'Cardio & Athletic': {
            color: 'orange',
            exercises: ['Brisk Walking', 'Incline Walking', 'Power Walking', 'Jogging', 'Long-Distance Running',
                       'Sprint Intervals', '40-Meter Sprints', 'Hill Sprints', 'Stair Sprints', 'Backpedal Running',
                       'Side Shuffles', 'Zig-Zag Running', 'Bear Crawls', 'High Knee Sprints', 'Bounding Strides']
        },
        'Recovery Time': {
            color: 'blue',
            exercises: ['5 Minutes', '10 Minutes', '15 Minutes', '20 Minutes', '25 Minutes', '30 Minutes',
                       '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours', '4 Hours',
                       '5 Hours', '6 Hours', '24 Hours']
        }
    };

    // Add these handlers after the workoutCategories object definition
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-link')) {
            const modal = document.getElementById('custom-workout-modal');
            modal.classList.add('active');
        }
    });

    const customWorkoutModal = document.getElementById('custom-workout-modal');
    const customWorkoutForm = document.getElementById('custom-workout-form');
    
    // Close modal on cancel or clicking outside
    document.querySelector('.cancel-btn').addEventListener('click', () => {
        customWorkoutModal.classList.remove('active');
    });
    
    customWorkoutModal.addEventListener('click', (e) => {
        if (e.target === customWorkoutModal) {
            customWorkoutModal.classList.remove('active');
        }
    });

    // Remove notifications from custom workout form submission
    customWorkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const workoutName = document.getElementById('custom-workout-name').value.trim();
        const workoutType = document.getElementById('custom-workout-type').value;
        
        // Add to workoutCategories
        if (!workoutCategories[workoutType].exercises.includes(workoutName)) {
            workoutCategories[workoutType].exercises.push(workoutName);
            
            // Save to localStorage
            const userId = auth.currentUser.uid;
            const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
            if (!customWorkouts[workoutType]) {
                customWorkouts[workoutType] = [];
            }
            customWorkouts[workoutType].push(workoutName);
            localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
            
            // Reset form and close modal
            customWorkoutForm.reset();
            customWorkoutModal.classList.remove('active');
            
            // Refresh workout list
            populateWorkoutList();
        }
    });

    // Modify populateWorkoutList function to include custom workouts
    function populateWorkoutList() {
        const workoutsList = document.getElementById('workouts-list');
        workoutsList.innerHTML = '';

        // Load custom workouts
        const userId = auth.currentUser?.uid;
        const customWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}') : {};
        const userWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]') : [];

        // Create a set of existing workout names for quick lookup
        const existingWorkouts = new Set(userWorkouts.map(w => w.name));

        Object.entries(workoutCategories).forEach(([category, data], index) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'workout-category';
            categoryDiv.style.animationDelay = `${index * 0.1}s`;

            // Combine built-in and custom exercises
            const allExercises = [...data.exercises];
            if (customWorkouts[category]) {
                allExercises.push(...customWorkouts[category]);
            }

            categoryDiv.innerHTML = `
                <h3 class="category-title ${data.color}">${category}</h3>
                <div class="workout-items">
                    ${allExercises.map((exercise, i) => `
                        <div class="workout-item ${existingWorkouts.has(exercise) ? 'disabled' : ''}" 
                             data-category="${category}" 
                             style="animation-delay: ${i * 0.05}s">
                            <span>${exercise}</span>
                            ${customWorkouts[category]?.includes(exercise) ? `
                                <button class="delete-custom-workout" title="Delete custom workout">
                                    <img src="images/trash.png" alt="Delete">
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            workoutsList.appendChild(categoryDiv);
        });

        // Add click handlers for workout items
        document.querySelectorAll('.workout-item').forEach(item => {
            if (!item.classList.contains('disabled')) {
                item.addEventListener('click', () => {
                    const workout = item.querySelector('span').textContent.trim();
                    const category = item.dataset.category;
                    if (saveUserWorkout(workout, category)) {
                        item.classList.add('disabled');
                    }
                });
            }
        });

        // Add delete handlers for custom workouts
        document.querySelectorAll('.delete-custom-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent workout selection
                const workoutItem = e.target.closest('.workout-item');
                const workout = workoutItem.querySelector('span').textContent.trim();
                const category = workoutItem.dataset.category;
                
                // Remove from customWorkouts
                const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
                if (customWorkouts[category]) {
                    customWorkouts[category] = customWorkouts[category].filter(w => w !== workout);
                    localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
                }
                
                // Animate removal
                workoutItem.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    populateWorkoutList(); // Refresh the list
                }, 300);
            });
        });
    }

    // Add these styles for the slideOut animation
    const slideOutStyle = document.createElement('style');
    slideOutStyle.textContent = `
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(slideOutStyle);

    // Initialize workout list when opening the popup
    document.getElementById('add-workout-btn').addEventListener('click', () => {
        const workoutSelectionOverlay = document.getElementById('workout-selection-overlay');
        workoutSelectionOverlay.classList.add('active');
        populateWorkoutList(); // Add this line to populate the list
    });

    // Load existing workouts when page loads
    auth.onAuthStateChanged((user) => {
        if (user) {
            updateWorkoutsList();
        }
    });

    // Add click handler for custom workout link
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-link')) {
            const modal = document.getElementById('custom-workout-modal');
            modal.classList.add('active');
        }
    });

    // Remove click handler for custom workout link since we're now opening modal directly
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-link')) {
            const modal = document.getElementById('custom-workout-modal');
            modal.classList.add('active');
        }
    });

    // Modify saveUserWorkout to not affect the workout list appearance
    function saveUserWorkout(workout, category) {
        const userId = auth.currentUser.uid;
        let userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        if (userWorkouts.some(w => w.name === workout)) {
            return false;
        }
        
        userWorkouts.push({
            name: workout,
            type: category,
            id: Date.now()
        });
        
        localStorage.setItem(`workouts_${userId}`, JSON.stringify(userWorkouts));
        updateWorkoutsList();
        return true;
    }

    // Modify custom workout form submission
    customWorkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const workoutName = document.getElementById('custom-workout-name').value.trim();
        const workoutType = document.getElementById('custom-workout-type').value;
        
        const userId = auth.currentUser.uid;
        const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
        
        // Initialize category array if it doesn't exist
        if (!customWorkouts[workoutType]) {
            customWorkouts[workoutType] = [];
        }
        
        // Check if workout already exists in category
        if (!customWorkouts[workoutType].includes(workoutName)) {
            customWorkouts[workoutType].push(workoutName);
            localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
            
            customWorkoutForm.reset();
            customWorkoutModal.classList.remove('active');
            
            // Add a slight delay before refreshing the page
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    });

    // Modify populateWorkoutList to properly handle custom workouts
    function populateWorkoutList() {
        const workoutsList = document.getElementById('workouts-list');
        workoutsList.innerHTML = '';

        const userId = auth.currentUser?.uid;
        const customWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}') : {};
        const userWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]') : [];

        const existingWorkouts = new Set(userWorkouts.map(w => w.name));

        Object.entries(workoutCategories).forEach(([category, data], index) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'workout-category';
            categoryDiv.style.animationDelay = `${index * 0.1}s`;

            // Get custom workouts for this category
            const customWorkoutsInCategory = customWorkouts[category] || [];
            const allExercises = [...data.exercises, ...customWorkoutsInCategory];

            categoryDiv.innerHTML = `
                <h3 class="category-title ${data.color}">${category}</h3>
                <div class="workout-items">
                    ${allExercises.map((exercise, i) => `
                        <div class="workout-item ${existingWorkouts.has(exercise) ? 'disabled' : ''}" 
                             data-category="${category}" 
                             style="animation-delay: ${i * 0.05}s">
                            <span>${exercise}</span>
                            ${customWorkoutsInCategory.includes(exercise) ? `
                                <button class="delete-custom-workout" title="Delete custom workout">
                                    <img src="images/trash.png" alt="Delete">
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            workoutsList.appendChild(categoryDiv);
        });

        // Add click handlers
        addWorkoutItemHandlers();
        addDeleteCustomWorkoutHandlers();
    }

    // Separate function for workout item click handlers
    function addWorkoutItemHandlers() {
        document.querySelectorAll('.workout-item').forEach(item => {
            if (!item.classList.contains('disabled')) {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.delete-custom-workout')) {
                        const workout = item.querySelector('span').textContent.trim();
                        const category = item.dataset.category;
                        if (saveUserWorkout(workout, category)) {
                            item.classList.add('disabled');
                        }
                    }
                });
            }
        });
    }

    // Separate function for delete custom workout handlers
    function addDeleteCustomWorkoutHandlers() {
        document.querySelectorAll('.delete-custom-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const workoutItem = e.target.closest('.workout-item');
                const workout = workoutItem.querySelector('span').textContent.trim();
                const category = workoutItem.dataset.category;
                
                const userId = auth.currentUser.uid;
                const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
                
                if (customWorkouts[category]) {
                    customWorkouts[category] = customWorkouts[category].filter(w => w !== workout);
                    if (customWorkouts[category].length === 0) {
                        delete customWorkouts[category];
                    }
                    localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
                }
                
                // Animate removal and refresh main list
                workoutItem.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    populateWorkoutList();
                    window.location.reload(); // Add this line to refresh the page
                }, 300);
            });
        });
    }

    // Calendar functionality
    const scheduleBtn = document.getElementById('add-schedule-btn');
    const scheduleOverlay = document.getElementById('schedule-selection-overlay');
    const calendarContainer = document.querySelector('.calendar-container');
    const weekdaysContainer = document.querySelector('.calendar-weekdays');
    const daysContainer = document.querySelector('.calendar-days');
    const currentMonthElement = document.querySelector('.current-month');
    const prevMonthBtn = document.querySelector('.prev-month');
    const nextMonthBtn = document.querySelector('.next-month');

    let currentDate = new Date();
    let selectedDate = null;

    // Initialize weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdaysContainer.innerHTML = weekdays.map(day => 
        `<div class="weekday">${day}</div>`
    ).join('');

    // Update calendar variables
    let startDate = null;
    let endDate = null;
    const MIN_DAYS = 30;

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let daysHTML = '';
        
        for (let i = 0; i < firstDay; i++) {
            daysHTML += '<div class="calendar-day disabled"></div>';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isDisabled = date < today;
            const isRangeStart = startDate && date.getTime() === startDate.getTime();
            const isRangeEnd = endDate && date.getTime() === endDate.getTime();
            const isInRange = startDate && endDate && 
                             date > startDate && date < endDate;
            
            daysHTML += `
                <div class="calendar-day ${isDisabled ? 'disabled' : ''} 
                                        ${isRangeStart ? 'range-start' : ''} 
                                        ${isRangeEnd ? 'range-end' : ''} 
                                        ${isInRange ? 'in-range' : ''}"
                     data-date="${date.toISOString()}">
                    ${day}
                </div>
            `;
        }
        
        daysContainer.innerHTML = daysHTML;

        // Add click handlers to days
        document.querySelectorAll('.calendar-day:not(.disabled)').forEach(day => {
            day.addEventListener('click', () => handleDateSelection(new Date(day.dataset.date)));
        });

        updateDateRangeInfo();
    }

    function handleDateSelection(date) {
        if (!startDate || (startDate && endDate) || date < startDate) {
            // Start new selection
            startDate = date;
            endDate = null;
            document.querySelector('.date-range-error')?.classList.remove('show');
        } else {
            // Complete selection
            const daysDiff = Math.ceil((date - startDate) / (1000 * 60 * 60 * 24));
            if (daysDiff < MIN_DAYS) {
                const errorElement = document.querySelector('.date-range-error');
                errorElement.textContent = `Please select a period of at least ${MIN_DAYS} days`;
                errorElement.classList.add('show');
                return;
            }
            endDate = date;
        }
        updateCalendar();
    }

    function updateDateRangeInfo() {
        const infoElement = document.querySelector('.date-range-info');
        if (!infoElement) return;

        if (startDate && endDate) {
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            infoElement.textContent = `Selected period: ${daysDiff} days`;
            infoElement.classList.add('show');
        } else if (startDate) {
            infoElement.textContent = 'Select end date';
            infoElement.classList.add('show');
        } else {
            infoElement.textContent = 'Select start date';
            infoElement.classList.add('show');
        }
    }

    // Update confirm handler
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        if (!startDate || !endDate) {
            const errorElement = document.querySelector('.date-range-error');
            errorElement.textContent = 'Please select both start and end dates';
            errorElement.classList.add('show');
            return;
        }

        // Save the schedule period
        saveSchedulePeriod(startDate, endDate);

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule period added successfully!', 'success');
        
        // Reset selection
        startDate = null;
        endDate = null;
    });

    // Update schedule button handler
    scheduleBtn.addEventListener('click', () => {
        startDate = null;
        endDate = null;
        currentDate = new Date();
        updateCalendar();
        scheduleOverlay.classList.add('active');
    });

    // Navigation handlers
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Schedule button handler
    scheduleBtn.addEventListener('click', () => {
        selectedDate = null;
        currentDate = new Date();
        updateCalendar();
        scheduleOverlay.classList.add('active');
    });

    // Close handlers
    document.querySelector('.calendar-cancel').addEventListener('click', () => {
        scheduleOverlay.classList.remove('active');
    });

    scheduleOverlay.addEventListener('click', (e) => {
        if (e.target === scheduleOverlay) {
            scheduleOverlay.classList.remove('active');
        }
    });

    // Confirm handler
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        const timeInput = document.getElementById('schedule-time');
        if (!selectedDate || !timeInput.value) {
            return;
        }

        // Here you would handle the selected date and time
        const scheduledDateTime = new Date(selectedDate);
        const [hours, minutes] = timeInput.value.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

        // You can save this to your storage/database
        console.log('Scheduled for:', scheduledDateTime);

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule added successfully!', 'success');
    });

    // Initialize calendar
    updateCalendar();

    // Add this function near other data storage functions
    function saveSchedulePeriod(startDate, endDate) {
        const userId = auth.currentUser.uid;
        const scheduleData = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            createdAt: new Date().toISOString(),
            id: Date.now() // Add unique ID for deletion
        };

        // Replace any existing schedule instead of pushing
        localStorage.setItem(`schedules_${userId}`, JSON.stringify([scheduleData]));
    }

    function deleteSchedule(scheduleId) {
        const userId = auth.currentUser.uid;
        localStorage.setItem(`schedules_${userId}`, '[]');
        updateScheduleDisplay();
    }

    function updateScheduleDisplay() {
        const userId = auth.currentUser.uid;
        const schedules = JSON.parse(localStorage.getItem(`schedules_${userId}`) || '[]');
        const weeksContainer = document.querySelector('.weeks-container');
        const daysContainer = document.querySelector('.days-container');

        weeksContainer.innerHTML = '';
        daysContainer.innerHTML = '';

        // Only display if there's a schedule
        if (schedules.length > 0) {
            const schedule = schedules[0]; // Get the only schedule
            const startDate = new Date(schedule.startDate);
            const endDate = new Date(schedule.endDate);
            const weekNumber = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
            
            // Add week entry with delete button (unchanged)
            const weekEntry = document.createElement('div');
            weekEntry.className = 'week-entry';
            
            weekEntry.innerHTML = `
                <div class="week-header">
                    <div class="week-title">Week ${weekNumber} Schedule</div>
                    <div class="week-info">
                        <div class="week-dates">
                            ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                        </div>
                        <button class="delete-schedule" data-id="${schedule.id}">
                            <img src="images/trash.png" alt="Delete">
                        </button>
                    </div>
                </div>
            `;
            weeksContainer.appendChild(weekEntry);

            // Get current date for comparison
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            let iterDate = new Date(startDate);
            while (iterDate <= endDate) {
                const dayEntry = document.createElement('div');
                dayEntry.className = 'day-entry';
                
                // Check if this is the current day
                const isCurrentDay = iterDate.getTime() === currentDate.getTime();
                if (isCurrentDay) {
                    dayEntry.classList.add('current-day');
                }
                
                const dayId = `day_${iterDate.toISOString().split('T')[0]}`;
                dayEntry.innerHTML = `
                    <div class="day-main-content">
                        <div class="day-date">
                            ${iterDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                            })}
                        </div>
                        <div class="day-actions">
                            <div class="day-status">Scheduled</div>
                            <button class="day-add-workout" data-day="${dayId}" title="Add workout"></button>
                        </div>
                    </div>
                    <div class="day-workouts" id="${dayId}"></div>
                `;
                daysContainer.appendChild(dayEntry);

                // Load and display existing workouts for this day
                const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                const workoutsContainer = dayEntry.querySelector('.day-workouts');
                
                dayWorkouts.forEach(workout => {
                    createWorkoutTag(workout, workoutsContainer, dayId);
                });

                // Add handler for the add workout button
                const addButton = dayEntry.querySelector('.day-add-workout');
                addButton.addEventListener('click', () => {
                    const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
                    if (userWorkouts.length === 0) {
                        showNotification('Add some workouts first in the Workouts section!', 'error');
                        return;
                    }

                    // Get existing workouts for this day
                    const existingDayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                    const existingWorkoutIds = new Set(existingDayWorkouts.map(w => w.id));

                    // Create and show workout selection dialog
                    const dialog = document.createElement('div');
                    dialog.className = 'workout-selection-overlay active';
                    dialog.innerHTML = `
                        <div class="workout-selection-container" style="opacity: 1; transform: translateY(0);">
                            <h2>Select Workout for ${iterDate.toLocaleDateString()}</h2>
                            <div class="workouts-list">
                                ${userWorkouts.map(workout => `
                                    <div class="workout-item ${existingWorkoutIds.has(workout.id) ? 'disabled' : ''}" 
                                         data-workout='${JSON.stringify(workout)}'>
                                        <span>${workout.name}</span>
                                        <small>(${workout.type})</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    document.body.appendChild(dialog);

                    // Handle workout selection
                    dialog.querySelectorAll('.workout-item:not(.disabled)').forEach(item => {
                        item.addEventListener('click', () => {
                            const workout = JSON.parse(item.dataset.workout);
                            
                            if (!existingWorkoutIds.has(workout.id)) {
                                const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                                dayWorkouts.push(workout);
                                localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(dayWorkouts));
                                
                                createWorkoutTag(workout, workoutsContainer, dayId);
                            }
                            
                            dialog.remove();
                        });
                    });

                    // Close dialog when clicking outside
                    dialog.addEventListener('click', (e) => {
                        if (e.target === dialog) {
                            dialog.remove();
                        }
                    });
                });
                
                iterDate.setDate(iterDate.getDate() + 1);
            }

            // Add delete handler
            const deleteBtn = weekEntry.querySelector('.delete-schedule');
            deleteBtn.addEventListener('click', () => {
                weekEntry.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => {
                    deleteSchedule(schedule.id);
                }, 300);
            });
        }
    }

    // Replace the calendar confirm handler
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        if (!startDate || !endDate) {
            const errorElement = document.querySelector('.date-range-error');
            errorElement.textContent = 'Please select both start and end dates';
            errorElement.classList.add('show');
            return;
        }

        // Save the schedule period
        saveSchedulePeriod(startDate, endDate);
        updateScheduleDisplay(); // Add this line

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule period added successfully!', 'success');
        
        // Reset selection
        startDate = null;
        endDate = null;
    });

    // Remove or comment out this section since we don't need time selection anymore
    // document.querySelector('.calendar-confirm').addEventListener('click', () => {
    //     const timeInput = document.getElementById('schedule-time');
    //     if (!selectedDate || !timeInput.value) {
    //         showNotification('Please select both date and time', 'error');
    //         return;
    //     }
    //     ...
    // });

    function updateDietSection() {
        const dietContainer = document.getElementById('diet-days-container');
        const scheduleData = JSON.parse(localStorage.getItem(`schedules_${auth.currentUser.uid}`) || '[]');

        // Calculate needed macros
        const userId = auth.currentUser.uid;
        const birthData = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
        const physiqueData = JSON.parse(localStorage.getItem(`physique_${userId}`) || '{}');
        
        const age = getUserAge(birthData);
        const weight = physiqueData.weight || 0;
        const neededMacros = calculateNeededMacros(age, weight);

        // Update the header section with inline targets
        const dietHeader = document.querySelector('.diet-header');
        if (dietHeader) {
            // Clear existing content
            dietHeader.innerHTML = `
                <div class="diet-title-group">
                    <h2 class="status-title">Diet Tracking</h2>
                    <div class="daily-targets-inline">
                        <div class="target-item">
                            <span class="target-label">Need:</span>
                            <span class="target-value">${neededMacros.calories} kcal</span>
                        </div>
                        <div class="target-item">
                            <span class="target-label">Protein:</span>
                            <span class="target-value">${neededMacros.protein}g</span>
                        </div>
                        <div class="target-item">
                            <span class="target-label">Carbs:</span>
                            <span class="target-value">${neededMacros.carbs}g</span>
                        </div>
                        <div class="target-item">
                            <span class="target-label">Fat:</span>
                            <span class="target-value">${neededMacros.fat}g</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (scheduleData.length === 0) {
            dietContainer.innerHTML = `
                <div class="no-schedule-message">Please set up a workout schedule first to track your diet</div>
            `;
            return;
        }

        const schedule = scheduleData[0];
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        let currentDate = new Date(startDate);

        dietContainer.innerHTML = '';
        
        const showMacroEditModal = (macroType, currentValue, dayId) => {
            if (macroType.toLowerCase() === 'calories') return; // Prevent editing calories directly
            
            const modal = document.createElement('div');
            modal.className = 'macro-edit-modal';
            
            modal.innerHTML = `
                <div class="macro-edit-container">
                    <h3>Edit ${macroType}</h3>
                    <div class="macro-input-group">
                        <label>Previous Value</label>
                        <input type="number" class="macro-input previous-value" value="${currentValue}" min="0" step="1">
                    </div>
                    <div class="macro-input-group">
                        <label>How Much Did You Eat?</label>
                        <input type="number" class="macro-input new-value" value="0" min="0" step="1">
                    </div>
                    <div class="macro-total">
                        <span>Total: ${currentValue}</span>
                    </div>
                    <div class="macro-actions">
                        <button class="macro-cancel">Cancel</button>
                        <button class="macro-save">Save</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 0);

            // Handle save
            modal.querySelector('.macro-save').addEventListener('click', () => {
                const prevValue = parseInt(modal.querySelector('.previous-value').value) || 0;
                const newValue = parseInt(modal.querySelector('.new-value').value) || 0;
                const totalValue = prevValue + newValue;
                
                const savedMacros = JSON.parse(localStorage.getItem(`macros_${auth.currentUser.uid}_${dayId}`) || '{}');
                savedMacros[macroType.toLowerCase()] = totalValue;
                
                // Calculate calories after updating macros
                const protein = savedMacros.protein || 0;
                const carbs = savedMacros.carbs || 0;
                const fat = savedMacros.fat || 0;
                savedMacros.calories = (protein * 4) + (carbs * 4) + (fat * 9);
                
                localStorage.setItem(`macros_${auth.currentUser.uid}_${dayId}`, JSON.stringify(savedMacros));
                updateDietSection();
                
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            });

            // Update total when either input changes
            const previousInput = modal.querySelector('.previous-value');
            const newInput = modal.querySelector('.new-value');
            const totalSpan = modal.querySelector('.macro-total span');

            const updateTotal = () => {
                const prevValue = parseInt(previousInput.value) || 0;
                const newValue = parseInt(newInput.value) || 0;
                totalSpan.textContent = `Total: ${prevValue + newValue}`;
            };

            previousInput.addEventListener('input', updateTotal);
            newInput.addEventListener('input', updateTotal);
            newInput.focus();

            // Handle cancel and outside click
            const closeModal = () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector('.macro-cancel').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // Handle Enter key on new value input
            newInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    modal.querySelector('.macro-save').click();
                }
            });
        };

        while (currentDate <= endDate) {
            const dayId = `diet_${currentDate.toISOString().split('T')[0]}`;
            const savedMacros = JSON.parse(localStorage.getItem(`macros_${auth.currentUser.uid}_${dayId}`) || '{}');
            const dayEntry = document.createElement('div');
            dayEntry.className = 'day-entry';
            
            const isCurrentDay = currentDate.toDateString() === new Date().toDateString();
            if (isCurrentDay) {
                dayEntry.classList.add('current-day');
            }

            // Get colors for each macro
            const proteinColor = getMacroColor('protein', savedMacros.protein || 0, neededMacros.protein);
            const carbsColor = getMacroColor('carbs', savedMacros.carbs || 0, neededMacros.carbs);
            const fatColor = getMacroColor('fat', savedMacros.fat || 0, neededMacros.fat);

            dayEntry.innerHTML = `
                <div class="day-main-content">
                    <div class="day-date">
                        ${currentDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                        })}
                    </div>
                    <div class="day-macros">
                        <span class="macro-item" data-macro="Calories" data-value="${savedMacros.calories || 0}">
                            Calories: ${savedMacros.calories || 0}
                        </span>
                        <span class="macro-item ${proteinColor}" data-macro="Protein" data-value="${savedMacros.protein || 0}">
                            Protein: ${savedMacros.protein || 0}g
                        </span>
                        <span class="macro-item ${carbsColor}" data-macro="Carbs" data-value="${savedMacros.carbs || 0}">
                            Carbs: ${savedMacros.carbs || 0}g
                        </span>
                        <span class="macro-item ${fatColor}" data-macro="Fat" data-value="${savedMacros.fat || 0}">
                            Fat: ${savedMacros.fat || 0}g
                        </span>
                    </div>
                </div>
            `;

            // Add click handlers for macro items
            dayEntry.querySelectorAll('.macro-item').forEach(item => {
                item.addEventListener('click', () => {
                    const macroType = item.dataset.macro;
                    const currentValue = parseInt(item.dataset.value) || 0;
                    showMacroEditModal(macroType, currentValue, dayId);
                });
            });

            dietContainer.appendChild(dayEntry);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // Add this function near other data storage functions
    function saveSchedulePeriod(startDate, endDate) {
        const userId = auth.currentUser.uid;
        const scheduleData = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            createdAt: new Date().toISOString(),
            id: Date.now() // Add unique ID for deletion
        };

        // Replace any existing schedule instead of pushing
        localStorage.setItem(`schedules_${userId}`, JSON.stringify([scheduleData]));
    }

    function deleteSchedule(scheduleId) {
        const userId = auth.currentUser.uid;
        localStorage.setItem(`schedules_${userId}`, '[]');
        updateScheduleDisplay();
    }

    function updateScheduleDisplay() {
        const userId = auth.currentUser.uid;
        const schedules = JSON.parse(localStorage.getItem(`schedules_${userId}`) || '[]');
        const weeksContainer = document.querySelector('.weeks-container');
        const daysContainer = document.querySelector('.days-container');

        weeksContainer.innerHTML = '';
        daysContainer.innerHTML = '';

        // Only display if there's a schedule
        if (schedules.length > 0) {
            const schedule = schedules[0]; // Get the only schedule
            const startDate = new Date(schedule.startDate);
            const endDate = new Date(schedule.endDate);
            const weekNumber = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
            
            // Add week entry with delete button (unchanged)
            const weekEntry = document.createElement('div');
            weekEntry.className = 'week-entry';
            
            weekEntry.innerHTML = `
                <div class="week-header">
                    <div class="week-title">Week ${weekNumber} Schedule</div>
                    <div class="week-info">
                        <div class="week-dates">
                            ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                        </div>
                        <button class="delete-schedule" data-id="${schedule.id}">
                            <img src="images/trash.png" alt="Delete">
                        </button>
                    </div>
                </div>
            `;
            weeksContainer.appendChild(weekEntry);

            // Get current date for comparison
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            let iterDate = new Date(startDate);
            while (iterDate <= endDate) {
                const dayEntry = document.createElement('div');
                dayEntry.className = 'day-entry';
                
                // Check if this is the current day
                const isCurrentDay = iterDate.getTime() === currentDate.getTime();
                if (isCurrentDay) {
                    dayEntry.classList.add('current-day');
                }
                
                const dayId = `day_${iterDate.toISOString().split('T')[0]}`;
                dayEntry.innerHTML = `
                    <div class="day-main-content">
                        <div class="day-date">
                            ${iterDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                            })}
                        </div>
                        <div class="day-actions">
                            <div class="day-status">Scheduled</div>
                            <button class="day-add-workout" data-day="${dayId}" title="Add workout"></button>
                        </div>
                    </div>
                    <div class="day-workouts" id="${dayId}"></div>
                `;
                daysContainer.appendChild(dayEntry);

                // Load and display existing workouts for this day
                const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                const workoutsContainer = dayEntry.querySelector('.day-workouts');
                
                dayWorkouts.forEach(workout => {
                    createWorkoutTag(workout, workoutsContainer, dayId);
                });

                // Add handler for the add workout button
                const addButton = dayEntry.querySelector('.day-add-workout');
                addButton.addEventListener('click', () => {
                    const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
                    if (userWorkouts.length === 0) {
                        showNotification('Add some workouts first in the Workouts section!', 'error');
                        return;
                    }

                    // Get existing workouts for this day
                    const existingDayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                    const existingWorkoutIds = new Set(existingDayWorkouts.map(w => w.id));

                    // Create and show workout selection dialog
                    const dialog = document.createElement('div');
                    dialog.className = 'workout-selection-overlay active';
                    dialog.innerHTML = `
                        <div class="workout-selection-container" style="opacity: 1; transform: translateY(0);">
                            <h2>Select Workout for ${iterDate.toLocaleDateString()}</h2>
                            <div class="workouts-list">
                                ${userWorkouts.map(workout => `
                                    <div class="workout-item ${existingWorkoutIds.has(workout.id) ? 'disabled' : ''}" 
                                         data-workout='${JSON.stringify(workout)}'>
                                        <span>${workout.name}</span>
                                        <small>(${workout.type})</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    document.body.appendChild(dialog);

                    // Handle workout selection
                    dialog.querySelectorAll('.workout-item:not(.disabled)').forEach(item => {
                        item.addEventListener('click', () => {
                            const workout = JSON.parse(item.dataset.workout);
                            
                            if (!existingWorkoutIds.has(workout.id)) {
                                const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                                dayWorkouts.push(workout);
                                localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(dayWorkouts));
                                
                                createWorkoutTag(workout, workoutsContainer, dayId);
                            }
                            
                            dialog.remove();
                        });
                    });

                    // Close dialog when clicking outside
                    dialog.addEventListener('click', (e) => {
                        if (e.target === dialog) {
                            dialog.remove();
                        }
                    });
                });
                
                iterDate.setDate(iterDate.getDate() + 1);
            }

            // Add delete handler
            const deleteBtn = weekEntry.querySelector('.delete-schedule');
            deleteBtn.addEventListener('click', () => {
                weekEntry.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => {
                    deleteSchedule(schedule.id);
                }, 300);
            });
        }
    }

    // Update the calendar confirm handler to refresh the schedule display
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        if (!startDate || !endDate) {
            const errorElement = document.querySelector('.date-range-error');
            errorElement.textContent = 'Please select both start and end dates';
            errorElement.classList.add('show');
            return;
        }

        saveSchedulePeriod(startDate, endDate);
        updateScheduleDisplay(); // Add this line

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule period added successfully!', 'success');
        
        startDate = null;
        endDate = null;
    });

    // Call updateScheduleDisplay when switching to schedule section
    function switchSection(sectionId) {
        // Hide all sections first
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show the selected section
        const targetSection = document.querySelector(`.section-content[data-section="${sectionId}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update button states
        sidebarButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            }
        });

        // Close sidebar and overlay
        sidebar.classList.remove('active');
        overlay.classList.remove('active');

        if (sectionId === 'schedule') {
            updateScheduleDisplay();
        } else if (sectionId === 'diet') {
            updateDietSection();
        } else if (sectionId === 'measurements') {
            updateMeasurementsList();
        } else if (sectionId === 'pictures') {
            updatePicturesGrid();
        } else if (sectionId === 'settings') {
            // Initialize settings section if needed
            initializeSettings();
        }
    }

    function createWorkoutTag(workout, workoutsContainer, dayId) {
        const userId = auth.currentUser.uid;
        const workoutTag = document.createElement('div');
        workoutTag.className = 'day-workout-tag';
        
        // Check if this is a fixed workout (dayId starts with "fixed_")
        const isFixedWorkout = dayId.startsWith('fixed_');
        
        // Get existing stats and times if any - use the appropriate key format
        const workoutStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
        const workoutTimes = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${dayId}_${workout.id}`) || '{}');
        
        // Check if this is the current day
        let isCurrentDay = false;
        
        if (isFixedWorkout) {
            // For fixed workouts, check if the day matches current weekday
            const currentDayName = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
            const fixedDayName = dayId.replace('fixed_', '');
            isCurrentDay = (currentDayName === fixedDayName);
        } else {
            // For normal workouts, check date
            isCurrentDay = dayId === `day_${new Date().toISOString().split('T')[0]}`;
        }
        
        // Get current time for comparison
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Find the closest time if it's current day
        let closestSet = null;
        let minTimeDiff = Infinity;
        
        if (isCurrentDay) {
            Object.entries(workoutTimes).forEach(([set, time]) => {
                const timeDiff = getTimeDifference(currentTime, time);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestSet = set;
                }
            });
        }

        workoutTag.className = `day-workout-tag ${isCurrentDay && closestSet ? 'current-workout' : ''}`;
        
        // Format workout stats for display
        let statsDisplay = '';
        if (workoutStats) {
            const formattedStats = 
                workoutStats.type === 'distance' ? `${workoutStats.value}km` : 
                workoutStats.type === 'time' ? `${workoutStats.value}m` :
                (workoutStats.type === 'reps' && workoutStats.value < 1) ? 
                    `Till Failure + x${Math.round(workoutStats.value * 10)}` :
                `x${workoutStats.value}`;
            
            statsDisplay = workoutStats.sets > 1 ? `${formattedStats} ${workoutStats.sets}s` : formattedStats;
        }
        
        workoutTag.innerHTML = `
            <div class="day-workout-content">
                ${workout.name}
                ${statsDisplay ? `<span class="workout-stats" style="display: inline-block;">${statsDisplay}</span>` : ''}
            </div>
            <div class="workout-actions">
                <button class="add-time-btn" title="Set time">
                    <img src="images/clock.png" alt="Set time" width="16" height="16">
                </button>
                <button class="add-stats-btn" title="Add stats"></button>
                <button class="delete-day-workout" data-workout-id="${workout.id}" title="Remove workout">
                    <img src="images/trash.png" alt="Delete">
                </button>
            </div>
            <div class="workout-times">
                ${Object.entries(workoutTimes).map(([set, time]) => `
                    <div class="workout-time-tag ${isCurrentDay && set === closestSet ? 'current-set' : ''}">
                        <span class="set-number">Set ${set}:</span>
                        <span class="time-value">${formatTime(time)}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Add time button handler
        const addTimeBtn = workoutTag.querySelector('.add-time-btn');
        addTimeBtn.addEventListener('click', () => {
            showTimeModal(workout, dayId, workoutTag);
        });

        // Add stats button handler
        const addStatsBtn = workoutTag.querySelector('.add-stats-btn');
        addStatsBtn.addEventListener('click', () => {
            showStatsModal(workout, dayId, workoutTag);
        });

        // Add delete handler
        const deleteBtn = workoutTag.querySelector('.delete-day-workout');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const workoutId = parseInt(e.currentTarget.dataset.workoutId);
            
            if (isFixedWorkout) {
                // Handle fixed workout delete
                const dayName = dayId.replace('fixed_', '');
                const fixedWorkouts = JSON.parse(localStorage.getItem(`fixed_workouts_${userId}`) || '{}');
                if (fixedWorkouts[dayName]) {
                    fixedWorkouts[dayName] = fixedWorkouts[dayName].filter(w => w.id !== workoutId);
                    localStorage.setItem(`fixed_workouts_${userId}`, JSON.stringify(fixedWorkouts));
                }
            } else {
                // Handle normal workout delete
            const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
            const updatedWorkouts = dayWorkouts.filter(w => w.id !== workoutId);
            localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(updatedWorkouts));
            }
            
            // Remove all associated data
            localStorage.removeItem(`workoutStats_${userId}_${dayId}_${workoutId}`);
            localStorage.removeItem(`workoutTimes_${userId}_${dayId}_${workoutId}`);
            
            workoutTag.style.opacity = '0';
            workoutTag.style.transform = 'scale(0.8)';
            setTimeout(() => workoutTag.remove(), 300);
        });

        workoutsContainer.appendChild(workoutTag);
        return workoutTag;
    }

    // Add this helper function to calculate time difference
    function getTimeDifference(time1, time2) {
        const [hours1, minutes1] = time1.split(':').map(Number);
        const [hours2, minutes2] = time2.split(':').map(Number);
        
        const totalMinutes1 = hours1 * 60 + minutes1;
        const totalMinutes2 = hours2 * 60 + minutes2;
        
        return Math.abs(totalMinutes1 - totalMinutes2);
    }

    // Add a function to periodically update highlights
    function updateCurrentWorkoutHighlight() {
        const currentDayId = `day_${new Date().toISOString().split('T')[0]}`;
        const currentDayWorkouts = document.querySelectorAll(`#${currentDayId} .day-workout-tag`);
        
        currentDayWorkouts.forEach(workoutTag => {
            // Remove current highlights
            workoutTag.classList.remove('current-workout');
            workoutTag.querySelectorAll('.workout-time-tag').forEach(timeTag => {
                timeTag.classList.remove('current-set');
            });
        });
        
        // Reapply highlights based on current time
        const userId = auth.currentUser.uid;
        currentDayWorkouts.forEach(workoutTag => {
            const workout = JSON.parse(workoutTag.dataset.workout || '{}');
            if (!workout.id) return;
            
            const workoutTimes = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${currentDayId}_${workout.id}`) || '{}');
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            let closestSet = null;
            let minTimeDiff = Infinity;
            
            Object.entries(workoutTimes).forEach(([set, time]) => {
                const timeDiff = getTimeDifference(currentTime, time);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestSet = set;
                }
            });
            
            if (closestSet) {
                workoutTag.classList.add('current-workout');
                workoutTag.querySelector(`.workout-time-tag:nth-child(${closestSet})`).classList.add('current-set');
            }
        });
    }

    // Add this to your initialization code
    document.addEventListener('DOMContentLoaded', () => {
        // ...existing code...
        
        // Update current workout highlight every minute
        setInterval(updateCurrentWorkoutHighlight, 60000);
        updateCurrentWorkoutHighlight(); // Initial call
    });

    function showStatsModal(workout, dayId, workoutTag) {
        const userId = auth.currentUser.uid;
        const modal = document.createElement('div');
        modal.className = 'stats-modal';
        
        // Get existing stats if any
        const existingStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
        
        modal.innerHTML = `
            <div class="stats-container">
                <h3 style="margin-top: 0; margin-bottom: 20px;">Add Stats for ${workout.name}</h3>
                <div class="stats-options">
                    <div class="stats-option ${existingStats?.type === 'distance' ? 'selected' : ''}" data-type="distance">Distance (km)</div>
                    <div class="stats-option ${existingStats?.type === 'reps' ? 'selected' : ''}" data-type="reps">Reps</div>
                    <div class="stats-option ${existingStats?.type === 'time' ? 'selected' : ''}" data-type="time">Time (m)</div>
                </div>
                <input type="number" class="stats-input" placeholder="Enter value" value="${existingStats?.value || ''}" min="0" step="0.1">
                <input type="number" class="sets-input" placeholder="Enter sets (optional)" value="${existingStats?.sets || ''}" min="1" step="1">
                <div class="stats-actions">
                    <button class="calendar-cancel">Cancel</button>
                    <button class="calendar-confirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 0);

        // Option selection
        const options = modal.querySelectorAll('.stats-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Confirm handler
        modal.querySelector('.calendar-confirm').addEventListener('click', () => {
            const selectedOption = modal.querySelector('.stats-option.selected');
            const value = modal.querySelector('.stats-input').value;
            const sets = parseInt(modal.querySelector('.sets-input').value) || 0;
            
            if (!selectedOption || !value) {
                showNotification('Please select a type and enter a value', 'error');
                return;
            }

            const stats = {
                type: selectedOption.dataset.type,
                value: parseFloat(value),
                sets: sets
            };

            // Save stats
            localStorage.setItem(`workoutStats_${userId}_${dayId}_${workout.id}`, JSON.stringify(stats));
            
            // Update workout tag display
            const workoutContent = workoutTag.querySelector('.day-workout-content');
            let statsSpan = workoutContent.querySelector('.workout-stats');
            if (!statsSpan) {
                statsSpan = document.createElement('span');
                statsSpan.className = 'workout-stats';
                workoutContent.appendChild(statsSpan);
            }
            
            let statValue = stats.type === 'distance' ? `${stats.value}km` : 
                             stats.type === 'time' ? 
                                 (stats.value < 1 ? `${Math.round(stats.value * 100)}sec` :
                                 Number.isInteger(stats.value) ? `${stats.value}m` :
                                 `${Math.floor(stats.value)}m ${Math.round((stats.value % 1) * 100)}sec`) :
                             (stats.type === 'reps' && stats.value < 1) ? 
                                 `Till Failure + x${Math.round(stats.value * 10)}` :
                             `x${stats.value}`;
            let displayText = `<span class="stat-value-highlight">${statValue}</span>`;
                             
            if (stats.sets > 1) {
                displayText += ` <span class="sets-count">${stats.sets}s</span>`;
            }
            
            statsSpan.innerHTML = displayText;

            // Close modal
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Cancel handler
        modal.querySelector('.calendar-cancel').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    function formatTime(time24) {
        const [hours24, minutes] = time24.split(':');
        let hours = parseInt(hours24);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12
        return `${hours}:${minutes} ${ampm}`;
    }

    function showTimeModal(workout, dayId, workoutTag) {
        const userId = auth.currentUser.uid;
        const workoutStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
        const workoutTimes = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${dayId}_${workout.id}`) || '{}');
        
        const modal = document.createElement('div');
        modal.className = 'time-modal';
        
        const sets = workoutStats?.sets || 1;
        const existingSets = Object.keys(workoutTimes);
        
        modal.innerHTML = `
            <div class="time-container">
                <h3 style="margin-top: 0; margin-bottom: 20px;">Set Time for ${workout.name}</h3>
                ${sets > 1 ? `
                    <select class="set-selector">
                        ${Array.from({length: sets}, (_, i) => i + 1)
                            .filter(set => !existingSets.includes(set.toString()))
                            .map(set => `
                                <option value="${set}">Set ${set}</option>
                            `).join('')}
                    </select>
                ` : ''}
                <input type="time" class="time-input" required>
                <div class="stats-actions">
                    <button class="calendar-cancel">Cancel</button>
                    <button class="calendar-confirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 0);

        // Handle confirm
        modal.querySelector('.calendar-confirm').addEventListener('click', () => {
            const timeInput = modal.querySelector('.time-input').value;
            if (!timeInput) {
                showNotification('Please select a time', 'error');
                return;
            }

            const setSelector = modal.querySelector('.set-selector');
            const selectedSet = setSelector ? setSelector.value : '1';
            
            // Save time
            const times = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${dayId}_${workout.id}`) || '{}');
            times[selectedSet] = timeInput;
            localStorage.setItem(`workoutTimes_${userId}_${dayId}_${workout.id}`, JSON.stringify(times));
            
            // Update display
            const timesContainer = workoutTag.querySelector('.workout-times');
            const timeTag = document.createElement('div');
            timeTag.className = 'workout-time-tag';
            timeTag.innerHTML = `
                <span class="set-number">Set ${selectedSet}:</span>
                <span class="time-value">${formatTime(timeInput)}</span>
            `;
            timesContainer.appendChild(timeTag);

            // Close modal
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Handle cancel and outside click
        modal.querySelector('.calendar-cancel').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    function initializeSettings() {
        const settingsContainer = document.querySelector('.settings-container');
        if (!settingsContainer) return;

        // Clear existing content
        settingsContainer.innerHTML = `
            <div class="settings-group">
                <h3 class="settings-group-title">Appearance</h3>
                <div class="settings-divider"></div>
                <div class="settings-entries">
                    <div class="settings-entry">
                        <div class="settings-entry-header">
                            <span class="settings-entry-title">Theme</span>
                            <div class="theme-switcher">
                                <input type="radio" id="lightTheme" name="theme" value="light">
                                <input type="radio" id="darkTheme" name="theme" value="dark">
                                <label for="lightTheme" class="theme-option">
                                    <span class="theme-icon">☀️</span>
                                    <span class="theme-text">Light</span>
                                </label>
                                <label for="darkTheme" class="theme-option">
                                    <span class="theme-icon">🌙</span>
                                    <span class="theme-text">Dark</span>
                                </label>
                                <div class="theme-slider"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize theme switcher
        const lightTheme = document.getElementById('lightTheme');
        const darkTheme = document.getElementById('darkTheme');
        
        if (lightTheme && darkTheme) {
            // Check saved preference
            const theme = localStorage.getItem('theme') || 'light';
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
                darkTheme.checked = true;
            } else {
                lightTheme.checked = true;
            }

            // Add event listeners
            lightTheme.addEventListener('change', () => {
                if (lightTheme.checked) {
                    document.body.classList.remove('dark-mode');
                    localStorage.setItem('theme', 'light');
                }
            });

            darkTheme.addEventListener('change', () => {
                if (darkTheme.checked) {
                    document.body.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                }
            });
        }
    }

    // Create update screen
    const updateScreen = document.createElement('div');
    updateScreen.id = 'update-screen';

    // Create gradient background
    const gradientBg = document.createElement('div');
    gradientBg.className = 'gradient-bg';
    updateScreen.appendChild(gradientBg);

    // Create content container
    const content = document.createElement('div');
    content.className = 'update-content';
    updateScreen.appendChild(content);

    // Create particles container
    const particles = document.createElement('div');
    particles.className = 'particles';
    updateScreen.appendChild(particles);

    // Add particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        particles.appendChild(particle);
    }

    // Create bubbles
    for (let i = 0; i < 15; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.setProperty('--left', `${Math.random() * 100}%`);
        bubble.style.setProperty('--duration', `${4 + Math.random() * 4}s`);
        bubble.style.width = `${20 + Math.random() * 30}px`;
        bubble.style.height = bubble.style.width;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        updateScreen.appendChild(bubble);
    }

    // Create header section
    const header = document.createElement('div');
    header.className = 'update-header';

    // Create title
    const title = document.createElement('div');
    title.className = 'update-title';
    title.textContent = 'New Update';
    header.appendChild(title);

    // Create version
    const version = document.createElement('div');
    version.className = 'update-version';
    version.textContent = 'Update 3';
    header.appendChild(version);

    content.appendChild(header);

    // Create features container
    const featuresContainer = document.createElement('div');
    featuresContainer.className = 'features-container';

    // Create features title
    const featuresTitle = document.createElement('div');
    featuresTitle.className = 'features-title';
    featuresTitle.textContent = 'What\'s New';
    featuresContainer.appendChild(featuresTitle);

    // Create features list
    const featuresList = document.createElement('div');
    featuresList.className = 'features-list';

    // Define features
    const features = [
        {
            icon: '⚙️',
            title: 'Settings Section',
            description: 'New comprehensive settings panel for customizing your experience'
        },
        {
            icon: '🎨',
            title: 'Themes & Dark Mode',
            description: 'Customizable themes and a sleek new dark mode for comfortable viewing'
        },
        {
            icon: '📱',
            title: 'Better Formatting',
            description: 'Improved visual layout and formatting across all sections'
        },
        {
            icon: '💪',
            title: 'Enhanced Workouts',
            description: 'Better visuals for fixed and scheduled workouts with improved tracking'
        }
    ];

    // Add features
    features.forEach(feature => {
        const featureItem = document.createElement('div');
        featureItem.className = 'feature-item';
        featureItem.innerHTML = `
            <div class="feature-icon">${feature.icon}</div>
            <div class="feature-title">${feature.title}</div>
            <div class="feature-description">${feature.description}</div>
        `;
        featuresList.appendChild(featureItem);
    });

    featuresContainer.appendChild(featuresList);

    // Add bug fixes note
    const bugFixes = document.createElement('div');
    bugFixes.className = 'bug-fixes';
    bugFixes.textContent = '284 bugs fixed for improved stability and performance';
    featuresContainer.appendChild(bugFixes);

    content.appendChild(featuresContainer);

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = 'Okey..';
    closeButton.addEventListener('click', () => {
        updateScreen.style.opacity = '0';
        updateScreen.style.transform = 'scale(0.95)';
        updateScreen.style.transition = 'all 0.5s ease-in-out';
        setTimeout(() => {
            updateScreen.remove();
        }, 500);
    });
    content.appendChild(closeButton);

    // Add to body
    document.body.appendChild(updateScreen);
});

// Add skincare button handlers
document.querySelectorAll('.skincare-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const overlay = document.getElementById('skincare-selection-overlay');
        overlay.classList.add('active');
    });
});

// Close skincare selection when clicking outside or cancel button
document.getElementById('skincare-selection-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'skincare-selection-overlay' || 
        e.target.classList.contains('skincare-cancel')) {
        document.getElementById('skincare-selection-overlay').classList.remove('active');
    }
});

function updateInfoCards() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const isQuestionnaireDone = localStorage.getItem(`questionnaire_completed_${userId}`) === 'true';
    const selectionArea = document.getElementById('selection-area');
    const infoCardsContainer = document.querySelector('.info-cards-container');

    // Show/hide the entire selection area based on questionnaire completion
    if (!isQuestionnaireDone) {
        selectionArea.classList.add('hide-selection');
        return;
    } else {
        selectionArea.classList.remove('hide-selection');
        infoCardsContainer.style.display = 'grid'; // Force grid display when questionnaire is done
        infoCardsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        infoCardsContainer.style.gap = '2rem';
        infoCardsContainer.style.padding = '1rem';
    }

    // Update card contents
    const physiqueData = JSON.parse(localStorage.getItem(`physique_${userId}`) || '{}');
    const nameData = JSON.parse(localStorage.getItem(`name_${userId}`) || '{}');
    const birthData = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
    const avatarData = JSON.parse(localStorage.getItem(`avatar_${userId}`) || '{}');
    const accountData = JSON.parse(localStorage.getItem(`account_${userId}`) || '{}');

    // Update physique card
    const physiqueCard = document.querySelector('.physique-card');
    if (physiqueCard) {
        physiqueCard.querySelector('.height span').textContent = physiqueData.height ? `${physiqueData.height} cm` : '--';
        physiqueCard.querySelector('.weight span').textContent = physiqueData.weight ? `${physiqueData.weight} kg` : '--';
        physiqueCard.querySelector('.metabolic span').textContent = physiqueData.metabolicRate ? `${physiqueData.metabolicRate} kcal` : '--';
    }

    // Update personal card
    const personalCard = document.querySelector('.personal-card');
    if (personalCard) {
        personalCard.querySelector('.firstname span').textContent = nameData.firstName || '--';
        personalCard.querySelector('.secondname span').textContent = nameData.secondName || '--';
        personalCard.querySelector('.lastname span').textContent = nameData.lastName || '--';
    }

    // Update birth card
    const birthCard = document.querySelector('.birth-card');
    if (birthCard) {
        birthCard.querySelector('.year span').textContent = birthData.year || '--';
        birthCard.querySelector('.month span').textContent = birthData.month ? getMonthName(birthData.month) : '--';
        birthCard.querySelector('.day span').textContent = birthData.day || '--';
    }

    // Update avatar card
    const avatarCard = document.querySelector('.avatar-card');
    if (avatarCard) {
        const avatarImg = avatarCard.querySelector('.avatar-preview img');
        if (avatarData.profilePicture) {
            avatarImg.src = avatarData.profilePicture;
        }
        avatarCard.querySelector('.nickname span').textContent = avatarData.nickname || '--';
        avatarCard.querySelector('.gender span').textContent = avatarData.gender || '--';
    }

    // Update account card
    const accountCard = document.querySelector('.account-info-card');
    if (accountCard) {
        accountCard.querySelector('.email span').textContent = accountData.email || '--';
        const passwordText = accountCard.querySelector('.password-text');
        if (accountData.password) {
            passwordText.textContent = '••••••••';
            passwordText.dataset.password = accountData.password;
        } else {
            passwordText.textContent = '--';
        }
    }

    // Update nutrition card
    const nutritionCard = document.querySelector('.nutrition-card');
    if (nutritionCard) {
        const birthData = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
        const age = getUserAge(birthData);
        const weight = physiqueData.weight || 0;
        const neededMacros = calculateNeededMacros(age, weight);

        // Update macro values
        nutritionCard.querySelector('.info-item:nth-child(1) span').textContent = `${neededMacros.calories} kcal`;
        nutritionCard.querySelector('.info-item:nth-child(2) span').textContent = `${neededMacros.protein}g`;
        nutritionCard.querySelector('.info-item:nth-child(3) span').textContent = `${neededMacros.carbs}g`;
        nutritionCard.querySelector('.info-item:nth-child(4) span').textContent = `${neededMacros.fat}g`;

        // Calculate tracking conditions for all scheduled days
        const scheduleData = JSON.parse(localStorage.getItem(`schedules_${userId}`) || '[]');
        const conditions = {
            good: 0,
            medium: 0,
            bad: 0
        };

        if (scheduleData.length > 0) {
            const schedule = scheduleData[0];
            const startDate = new Date(schedule.startDate);
            const endDate = new Date(schedule.endDate);
            let currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const dayId = `diet_${currentDate.toISOString().split('T')[0]}`;
                const savedMacros = JSON.parse(localStorage.getItem(`macros_${userId}_${dayId}`) || '{}');

                // Check each macro type
                const proteinColor = getMacroColor('protein', savedMacros.protein || 0, neededMacros.protein);
                const carbsColor = getMacroColor('carbs', savedMacros.carbs || 0, neededMacros.carbs);
                const fatColor = getMacroColor('fat', savedMacros.fat || 0, neededMacros.fat);

                // Count conditions
                [proteinColor, carbsColor, fatColor].forEach(color => {
                    if (color === 'green') conditions.good++;
                    else if (color === 'yellow') conditions.medium++;
                    else if (color === 'red') conditions.bad++;
                });

                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        // Update condition stats
        nutritionCard.querySelector('.condition-item.good span').textContent = conditions.good;
        nutritionCard.querySelector('.condition-item.medium span').textContent = conditions.medium;
        nutritionCard.querySelector('.condition-item.bad span').textContent = conditions.bad;
    }
}

function getMonthName(monthNumber) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNumber - 1] || '--';
}

function updateScheduleDisplay() {
    const userId = auth.currentUser.uid;
    const schedules = JSON.parse(localStorage.getItem(`schedules_${userId}`) || '[]');
    const weeksContainer = document.querySelector('.weeks-container');
    const daysContainer = document.querySelector('.days-container');

    weeksContainer.innerHTML = '';
    daysContainer.innerHTML = '';

    // Only display if there's a schedule
    if (schedules.length > 0) {
        const schedule = schedules[0]; // Get the only schedule
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        const weekNumber = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
        
        // Add week entry with delete button (unchanged)
        const weekEntry = document.createElement('div');
        weekEntry.className = 'week-entry';
        
        weekEntry.innerHTML = `
            <div class="week-header">
                <div class="week-title">Week ${weekNumber} Schedule</div>
                <div class="week-info">
                    <div class="week-dates">
                        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                    </div>
                    <button class="delete-schedule" data-id="${schedule.id}">
                        <img src="images/trash.png" alt="Delete">
                    </button>
                </div>
            </div>
        `;
        weeksContainer.appendChild(weekEntry);

        // Get current date for comparison
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        let iterDate = new Date(startDate);
        while (iterDate <= endDate) {
            const dayEntry = document.createElement('div');
            dayEntry.className = 'day-entry';
            
            // Check if this is the current day
            const isCurrentDay = iterDate.getTime() === currentDate.getTime();
            if (isCurrentDay) {
                dayEntry.classList.add('current-day');
            }
            
            const dayId = `day_${iterDate.toISOString().split('T')[0]}`;
            dayEntry.innerHTML = `
                <div class="day-main-content">
                    <div class="day-date">
                        ${iterDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                        })}
                    </div>
                    <div class="day-actions">
                        <div class="day-status">Scheduled</div>
                        <button class="day-add-workout" data-day="${dayId}" title="Add workout"></button>
                    </div>
                </div>
                <div class="day-workouts" id="${dayId}"></div>
            `;
            daysContainer.appendChild(dayEntry);

            // Load and display existing workouts for this day
            const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
            const workoutsContainer = dayEntry.querySelector('.day-workouts');
            
            dayWorkouts.forEach(workout => {
                createWorkoutTag(workout, workoutsContainer, dayId);
            });

            // Add handler for the add workout button
            const addButton = dayEntry.querySelector('.day-add-workout');
            addButton.addEventListener('click', () => {
                const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
                if (userWorkouts.length === 0) {
                    showNotification('Add some workouts first in the Workouts section!', 'error');
                    return;
                }

                // Get existing workouts for this day
                const existingDayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                const existingWorkoutIds = new Set(existingDayWorkouts.map(w => w.id));

                // Create and show workout selection dialog
                const dialog = document.createElement('div');
                dialog.className = 'workout-selection-overlay active';
                dialog.innerHTML = `
                    <div class="workout-selection-container" style="opacity: 1; transform: translateY(0);">
                        <h2>Select Workout for ${iterDate.toLocaleDateString()}</h2>
                        <div class="workouts-list">
                            ${userWorkouts.map(workout => `
                                <div class="workout-item ${existingWorkoutIds.has(workout.id) ? 'disabled' : ''}" 
                                     data-workout='${JSON.stringify(workout)}'>
                                    <span>${workout.name}</span>
                                    <small>(${workout.type})</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                document.body.appendChild(dialog);

                // Handle workout selection
                dialog.querySelectorAll('.workout-item:not(.disabled)').forEach(item => {
                    item.addEventListener('click', () => {
                        const workout = JSON.parse(item.dataset.workout);
                        
                        if (!existingWorkoutIds.has(workout.id)) {
                            const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                            dayWorkouts.push(workout);
                            localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(dayWorkouts));
                            
                            createWorkoutTag(workout, workoutsContainer, dayId);
                        }
                        
                        dialog.remove();
                    });
                });

                // Close dialog when clicking outside
                dialog.addEventListener('click', (e) => {
                    if (e.target === dialog) {
                        dialog.remove();
                    }
                });
            });
            
            iterDate.setDate(iterDate.getDate() + 1);
        }

        // Add delete handler
        const deleteBtn = weekEntry.querySelector('.delete-schedule');
        deleteBtn.addEventListener('click', () => {
            weekEntry.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => {
                deleteSchedule(schedule.id);
            }, 300);
        });
    }
}

// Update the calendar confirm handler to refresh the schedule display
document.querySelector('.calendar-confirm').addEventListener('click', () => {
    if (!startDate || !endDate) {
        const errorElement = document.querySelector('.date-range-error');
        errorElement.textContent = 'Please select both start and end dates';
        errorElement.classList.add('show');
        return;
    }

    saveSchedulePeriod(startDate, endDate);
    updateScheduleDisplay(); // Add this line

    scheduleOverlay.classList.remove('active');
    showNotification('Schedule period added successfully!', 'success');
    
    startDate = null;
    endDate = null;
});

// Call updateScheduleDisplay when switching to schedule section
function switchSection(sectionId) {
    // Hide all sections first
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show the selected section
    const targetSection = document.querySelector(`.section-content[data-section="${sectionId}"]`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update button states
    sidebarButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        }
    });

    // Close sidebar and overlay
    sidebar.classList.remove('active');
    overlay.classList.remove('active');

    if (sectionId === 'schedule') {
        updateScheduleDisplay();
    } else if (sectionId === 'diet') {
        updateDietSection();
    } else if (sectionId === 'measurements') {
        updateMeasurementsList();
    } else if (sectionId === 'pictures') {
        updatePicturesGrid();
    } else if (sectionId === 'settings') {
        // Initialize settings section if needed
        initializeSettings();
    }
}

function createWorkoutTag(workout, workoutsContainer, dayId) {
    const userId = auth.currentUser.uid;
    const workoutTag = document.createElement('div');
    workoutTag.className = 'day-workout-tag';
    
    // Check if this is a fixed workout (dayId starts with "fixed_")
    const isFixedWorkout = dayId.startsWith('fixed_');
    
    // Get existing stats and times if any - use the appropriate key format
    const workoutStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
    const workoutTimes = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${dayId}_${workout.id}`) || '{}');
    
    // Check if this is the current day
    let isCurrentDay = false;
    
    if (isFixedWorkout) {
        // For fixed workouts, check if the day matches current weekday
        const currentDayName = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        const fixedDayName = dayId.replace('fixed_', '');
        isCurrentDay = (currentDayName === fixedDayName);
    } else {
        // For normal workouts, check date
        isCurrentDay = dayId === `day_${new Date().toISOString().split('T')[0]}`;
    }
    
    // Get current time for comparison
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find the closest time if it's current day
    let closestSet = null;
    let minTimeDiff = Infinity;
    
    if (isCurrentDay) {
        Object.entries(workoutTimes).forEach(([set, time]) => {
            const timeDiff = getTimeDifference(currentTime, time);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestSet = set;
            }
        });
    }

    workoutTag.className = `day-workout-tag ${isCurrentDay && closestSet ? 'current-workout' : ''}`;
    
    // Format workout stats for display
    let statsDisplay = '';
    if (workoutStats) {
        const formattedStats = 
            workoutStats.type === 'distance' ? `${workoutStats.value}km` : 
            workoutStats.type === 'time' ? `${workoutStats.value}m` :
            (workoutStats.type === 'reps' && workoutStats.value < 1) ? 
                `Till Failure + x${Math.round(workoutStats.value * 10)}` :
            `x${workoutStats.value}`;
        
        statsDisplay = `<span class="stat-value-highlight">${formattedStats}</span>`;
        if (workoutStats.sets > 1) {
            statsDisplay += ` <span class="sets-count">${workoutStats.sets}s</span>`;
        }
    }
    
    workoutTag.innerHTML = `
        <div class="day-workout-content">
            ${workout.name}
            ${statsDisplay ? `<span class="workout-stats">${statsDisplay}</span>` : ''}
        </div>
        <div class="workout-actions">
            <button class="add-time-btn" title="Set time">
                <img src="images/clock.png" alt="Set time" width="16" height="16">
            </button>
            <button class="add-stats-btn" title="Add stats"></button>
            <button class="delete-day-workout" data-workout-id="${workout.id}" title="Remove workout">
                <img src="images/trash.png" alt="Delete">
            </button>
        </div>
        <div class="workout-times">
            ${Object.entries(workoutTimes).map(([set, time]) => `
                <div class="workout-time-tag ${isCurrentDay && set === closestSet ? 'current-set' : ''}">
                    <span class="set-number">Set ${set}:</span>
                    <span class="time-value">${formatTime(time)}</span>
                </div>
            `).join('')}
        </div>
    `;

    // Add time button handler
    const addTimeBtn = workoutTag.querySelector('.add-time-btn');
    addTimeBtn.addEventListener('click', () => {
        showTimeModal(workout, dayId, workoutTag);
    });

    // Add stats button handler
    const addStatsBtn = workoutTag.querySelector('.add-stats-btn');
    addStatsBtn.addEventListener('click', () => {
        showStatsModal(workout, dayId, workoutTag);
    });

    // Add delete handler
    const deleteBtn = workoutTag.querySelector('.delete-day-workout');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const workoutId = parseInt(e.currentTarget.dataset.workoutId);
        
        if (isFixedWorkout) {
            // Handle fixed workout delete
            const dayName = dayId.replace('fixed_', '');
            const fixedWorkouts = JSON.parse(localStorage.getItem(`fixed_workouts_${userId}`) || '{}');
            if (fixedWorkouts[dayName]) {
                fixedWorkouts[dayName] = fixedWorkouts[dayName].filter(w => w.id !== workoutId);
                localStorage.setItem(`fixed_workouts_${userId}`, JSON.stringify(fixedWorkouts));
            }
        } else {
            // Handle normal workout delete
        const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
        const updatedWorkouts = dayWorkouts.filter(w => w.id !== workoutId);
        localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(updatedWorkouts));
        }
        
        // Remove all associated data
        localStorage.removeItem(`workoutStats_${userId}_${dayId}_${workoutId}`);
        localStorage.removeItem(`workoutTimes_${userId}_${dayId}_${workoutId}`);
        
        workoutTag.style.opacity = '0';
        workoutTag.style.transform = 'scale(0.8)';
        setTimeout(() => workoutTag.remove(), 300);
    });

    workoutsContainer.appendChild(workoutTag);
    return workoutTag;
}

// Add this helper function to calculate time difference
function getTimeDifference(time1, time2) {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);
    
    const totalMinutes1 = hours1 * 60 + minutes1;
    const totalMinutes2 = hours2 * 60 + minutes2;
    
    return Math.abs(totalMinutes1 - totalMinutes2);
}

// Add a function to periodically update highlights
function updateCurrentWorkoutHighlight() {
    const currentDayId = `day_${new Date().toISOString().split('T')[0]}`;
    const currentDayWorkouts = document.querySelectorAll(`#${currentDayId} .day-workout-tag`);
    
    currentDayWorkouts.forEach(workoutTag => {
        // Remove current highlights
        workoutTag.classList.remove('current-workout');
        workoutTag.querySelectorAll('.workout-time-tag').forEach(timeTag => {
            timeTag.classList.remove('current-set');
        });
    });
    
    // Reapply highlights based on current time
    const userId = auth.currentUser.uid;
    currentDayWorkouts.forEach(workoutTag => {
        const workout = JSON.parse(workoutTag.dataset.workout || '{}');
        if (!workout.id) return;
        
        const workoutTimes = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${currentDayId}_${workout.id}`) || '{}');
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        let closestSet = null;
        let minTimeDiff = Infinity;
        
        Object.entries(workoutTimes).forEach(([set, time]) => {
            const timeDiff = getTimeDifference(currentTime, time);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestSet = set;
            }
        });
        
        if (closestSet) {
            workoutTag.classList.add('current-workout');
            workoutTag.querySelector(`.workout-time-tag:nth-child(${closestSet})`).classList.add('current-set');
        }
    });
}

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Update current workout highlight every minute
    setInterval(updateCurrentWorkoutHighlight, 60000);
    updateCurrentWorkoutHighlight(); // Initial call
});

function showStatsModal(workout, dayId, workoutTag) {
    const userId = auth.currentUser.uid;
    const modal = document.createElement('div');
    modal.className = 'stats-modal';
    
    // Get existing stats if any
    const existingStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
    
    modal.innerHTML = `
        <div class="stats-container">
            <h3 style="margin-top: 0; margin-bottom: 20px;">Add Stats for ${workout.name}</h3>
            <div class="stats-options">
                <div class="stats-option ${existingStats?.type === 'distance' ? 'selected' : ''}" data-type="distance">Distance (km)</div>
                <div class="stats-option ${existingStats?.type === 'reps' ? 'selected' : ''}" data-type="reps">Reps</div>
                <div class="stats-option ${existingStats?.type === 'time' ? 'selected' : ''}" data-type="time">Time (m)</div>
            </div>
            <input type="number" class="stats-input" placeholder="Enter value" value="${existingStats?.value || ''}" min="0" step="0.1">
            <input type="number" class="sets-input" placeholder="Enter sets (optional)" value="${existingStats?.sets || ''}" min="1" step="1">
            <div class="stats-actions">
                <button class="calendar-cancel">Cancel</button>
                <button class="calendar-confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 0);

    // Option selection
    const options = modal.querySelectorAll('.stats-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Confirm handler
    modal.querySelector('.calendar-confirm').addEventListener('click', () => {
        const selectedOption = modal.querySelector('.stats-option.selected');
        const value = modal.querySelector('.stats-input').value;
        const sets = parseInt(modal.querySelector('.sets-input').value) || 0;
        
        if (!selectedOption || !value) {
            showNotification('Please select a type and enter a value', 'error');
            return;
        }

        const stats = {
            type: selectedOption.dataset.type,
            value: parseFloat(value),
            sets: sets
        };

        // Save stats
        localStorage.setItem(`workoutStats_${userId}_${dayId}_${workout.id}`, JSON.stringify(stats));
        
        // Update workout tag display
        const workoutContent = workoutTag.querySelector('.day-workout-content');
        let statsSpan = workoutContent.querySelector('.workout-stats');
        if (!statsSpan) {
            statsSpan = document.createElement('span');
            statsSpan.className = 'workout-stats';
            workoutContent.appendChild(statsSpan);
        }
        
        let statValue = stats.type === 'distance' ? `${stats.value}km` : 
                             stats.type === 'time' ? 
                                 (stats.value < 1 ? `${Math.round(stats.value * 100)}sec` :
                                 Number.isInteger(stats.value) ? `${stats.value}m` :
                                 `${Math.floor(stats.value)}m ${Math.round((stats.value % 1) * 100)}sec`) :
                             (stats.type === 'reps' && stats.value < 1) ? 
                                 `Till Failure + x${Math.round(stats.value * 10)}` :
                             `x${stats.value}`;
        let displayText = `<span class="stat-value-highlight">${statValue}</span>`;
                         
        if (stats.sets > 1) {
            displayText += ` ${stats.sets}s`;
        }
        
        statsSpan.innerHTML = displayText;

        // Close modal
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    // Cancel handler
    modal.querySelector('.calendar-cancel').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

function formatTime(time24) {
    const [hours24, minutes] = time24.split(':');
    let hours = parseInt(hours24);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    return `${hours}:${minutes} ${ampm}`;
}

function showTimeModal(workout, dayId, workoutTag) {
    const userId = auth.currentUser.uid;
    const workoutStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
    const workoutTimes = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${dayId}_${workout.id}`) || '{}');
    
    const modal = document.createElement('div');
    modal.className = 'time-modal';
    
    const sets = workoutStats?.sets || 1;
    const existingSets = Object.keys(workoutTimes);
    
    modal.innerHTML = `
        <div class="time-container">
            <h3 style="margin-top: 0; margin-bottom: 20px;">Set Time for ${workout.name}</h3>
            ${sets > 1 ? `
                <select class="set-selector">
                    ${Array.from({length: sets}, (_, i) => i + 1)
                        .filter(set => !existingSets.includes(set.toString()))
                        .map(set => `
                            <option value="${set}">Set ${set}</option>
                        `).join('')}
                </select>
            ` : ''}
            <input type="time" class="time-input" required>
            <div class="stats-actions">
                <button class="calendar-cancel">Cancel</button>
                <button class="calendar-confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 0);

    // Handle confirm
    modal.querySelector('.calendar-confirm').addEventListener('click', () => {
        const timeInput = modal.querySelector('.time-input').value;
        if (!timeInput) {
            showNotification('Please select a time', 'error');
            return;
        }

        const setSelector = modal.querySelector('.set-selector');
        const selectedSet = setSelector ? setSelector.value : '1';
        
        // Save time
        const times = JSON.parse(localStorage.getItem(`workoutTimes_${userId}_${dayId}_${workout.id}`) || '{}');
        times[selectedSet] = timeInput;
        localStorage.setItem(`workoutTimes_${userId}_${dayId}_${workout.id}`, JSON.stringify(times));
        
        // Update display
        const timesContainer = workoutTag.querySelector('.workout-times');
        const timeTag = document.createElement('div');
        timeTag.className = 'workout-time-tag';
        timeTag.innerHTML = `
            <span class="set-number">Set ${selectedSet}:</span>
            <span class="time-value">${formatTime(timeInput)}</span>
        `;
        timesContainer.appendChild(timeTag);

        // Close modal
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    // Handle cancel and outside click
    modal.querySelector('.calendar-cancel').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

function calculateNeededMacros(age, weightKg) {
    let fatMultiplier = age >= 9 && age <= 14 ? 1.30 : 1.5;
    let proteinMultiplier = age >= 9 && age <= 14 ? 1.8 : 2.0;
    const carbsMultiplier = 6.5;

    const neededFat = Math.round(weightKg * fatMultiplier);
    const neededProtein = Math.round(weightKg * proteinMultiplier);
    const neededCarbs = Math.round(weightKg * carbsMultiplier);
    const neededCalories = Math.round((neededProtein * 4) + (neededCarbs * 4) + (neededFat * 9));

    return {
        fat: neededFat,
        protein: neededProtein,
        carbs: neededCarbs,
        calories: neededCalories
    };
}

function getUserAge(birthData) {
    const today = new Date();
    const birthDate = new Date(birthData.year, birthData.month - 1, birthData.day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function createMacrosDisplay(macros) {
    const container = document.createElement('div');
    container.className = 'needed-macros-display';
    
    container.innerHTML = `
        <h3>Daily Targets</h3>
        <div class="macro-target">
            <span class="macro-label">Calories:</span>
            <span class="macro-value">${macros.calories} kcal</span>
        </div>
        <div class="macro-target">
            <span class="macro-label">Protein:</span>
            <span class="macro-value">${macros.protein}g</span>
        </div>
        <div class="macro-target">
            <span class="macro-label">Carbs:</span>
            <span class="macro-value">${macros.carbs}g</span>
        </div>
        <div class="macro-target">
            <span class="macro-label">Fat:</span>
            <span class="macro-value">${macros.fat}g</span>
        </div>
    `;

    return container;
}

// Add these helper functions
function getMacroColor(type, current, needed) {
    switch (type.toLowerCase()) {
        case 'protein':
            if (current >= (needed - 10)) return 'green';
            if (current >= (needed - 20)) return 'yellow';
            return 'red';
        case 'carbs':
            if (current >= (needed - 25)) return 'green';
            if (current >= (needed - 40)) return 'yellow';
            return 'red';
        case 'fat':
            if (current >= (needed - 5)) return 'green';
            if (current >= (needed - 10)) return 'yellow';
            return 'red';
        default:
            return '';
    }
}

// Modify the updateDietSection function
function updateDietSection() {
    const dietContainer = document.getElementById('diet-days-container');
    const scheduleData = JSON.parse(localStorage.getItem(`schedules_${auth.currentUser.uid}`) || '[]');

    // Calculate needed macros
    const userId = auth.currentUser.uid;
    const birthData = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
    const physiqueData = JSON.parse(localStorage.getItem(`physique_${userId}`) || '{}');
    
    const age = getUserAge(birthData);
    const weight = physiqueData.weight || 0;
    const neededMacros = calculateNeededMacros(age, weight);

    // Update the header section with inline targets
    const dietHeader = document.querySelector('.diet-header');
    if (dietHeader) {
        // Clear existing content
        dietHeader.innerHTML = `
            <div class="diet-title-group">
                <h2 class="status-title">Diet Tracking</h2>
                <div class="daily-targets-inline">
                    <div class="target-item">
                        <span class="target-label">Need:</span>
                        <span class="target-value">${neededMacros.calories} kcal</span>
                    </div>
                    <div class="target-item">
                        <span class="target-label">Protein:</span>
                        <span class="target-value">${neededMacros.protein}g</span>
                    </div>
                    <div class="target-item">
                        <span class="target-label">Carbs:</span>
                        <span class="target-value">${neededMacros.carbs}g</span>
                    </div>
                    <div class="target-item">
                        <span class="target-label">Fat:</span>
                        <span class="target-value">${neededMacros.fat}g</span>
                    </div>
                </div>
            </div>
        `;
    }

    if (scheduleData.length === 0) {
        dietContainer.innerHTML = `
            <div class="no-schedule-message">Please set up a workout schedule first to track your diet</div>
        `;
        return;
    }

    const schedule = scheduleData[0];
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    let currentDate = new Date(startDate);

    dietContainer.innerHTML = '';
    
    const showMacroEditModal = (macroType, currentValue, dayId) => {
        if (macroType.toLowerCase() === 'calories') return; // Prevent editing calories directly
        
        const modal = document.createElement('div');
        modal.className = 'macro-edit-modal';
        
        modal.innerHTML = `
            <div class="macro-edit-container">
                <h3>Edit ${macroType}</h3>
                <div class="macro-input-group">
                    <label>Previous Value</label>
                    <input type="number" class="macro-input previous-value" value="${currentValue}" min="0" step="1">
                </div>
                <div class="macro-input-group">
                    <label>How Much Did You Eat?</label>
                    <input type="number" class="macro-input new-value" value="0" min="0" step="1">
                </div>
                <div class="macro-total">
                    <span>Total: ${currentValue}</span>
                </div>
                <div class="macro-actions">
                    <button class="macro-cancel">Cancel</button>
                    <button class="macro-save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 0);

        // Handle save
        modal.querySelector('.macro-save').addEventListener('click', () => {
            const prevValue = parseInt(modal.querySelector('.previous-value').value) || 0;
            const newValue = parseInt(modal.querySelector('.new-value').value) || 0;
            const totalValue = prevValue + newValue;
            
            const savedMacros = JSON.parse(localStorage.getItem(`macros_${auth.currentUser.uid}_${dayId}`) || '{}');
            savedMacros[macroType.toLowerCase()] = totalValue;
            
            // Calculate calories after updating macros
            const protein = savedMacros.protein || 0;
            const carbs = savedMacros.carbs || 0;
            const fat = savedMacros.fat || 0;
            savedMacros.calories = (protein * 4) + (carbs * 4) + (fat * 9);
            
            localStorage.setItem(`macros_${auth.currentUser.uid}_${dayId}`, JSON.stringify(savedMacros));
            updateDietSection();
            
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Update total when either input changes
        const previousInput = modal.querySelector('.previous-value');
        const newInput = modal.querySelector('.new-value');
        const totalSpan = modal.querySelector('.macro-total span');

        const updateTotal = () => {
            const prevValue = parseInt(previousInput.value) || 0;
            const newValue = parseInt(newInput.value) || 0;
            totalSpan.textContent = `Total: ${prevValue + newValue}`;
        };

        previousInput.addEventListener('input', updateTotal);
        newInput.addEventListener('input', updateTotal);
        newInput.focus();

        // Handle cancel and outside click
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.macro-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Handle Enter key on new value input
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('.macro-save').click();
            }
        });
    };

    while (currentDate <= endDate) {
        const dayId = `diet_${currentDate.toISOString().split('T')[0]}`;
        const savedMacros = JSON.parse(localStorage.getItem(`macros_${auth.currentUser.uid}_${dayId}`) || '{}');
        const dayEntry = document.createElement('div');
        dayEntry.className = 'day-entry';
        
        const isCurrentDay = currentDate.toDateString() === new Date().toDateString();
        if (isCurrentDay) {
            dayEntry.classList.add('current-day');
        }

        // Get colors for each macro
        const proteinColor = getMacroColor('protein', savedMacros.protein || 0, neededMacros.protein);
        const carbsColor = getMacroColor('carbs', savedMacros.carbs || 0, neededMacros.carbs);
        const fatColor = getMacroColor('fat', savedMacros.fat || 0, neededMacros.fat);

        dayEntry.innerHTML = `
            <div class="day-main-content">
                <div class="day-date">
                    ${currentDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                    })}
                </div>
                <div class="day-macros">
                    <span class="macro-item" data-macro="Calories" data-value="${savedMacros.calories || 0}">
                        Calories: ${savedMacros.calories || 0}
                    </span>
                    <span class="macro-item ${proteinColor}" data-macro="Protein" data-value="${savedMacros.protein || 0}">
                        Protein: ${savedMacros.protein || 0}g
                    </span>
                    <span class="macro-item ${carbsColor}" data-macro="Carbs" data-value="${savedMacros.carbs || 0}">
                        Carbs: ${savedMacros.carbs || 0}g
                    </span>
                    <span class="macro-item ${fatColor}" data-macro="Fat" data-value="${savedMacros.fat || 0}">
                        Fat: ${savedMacros.fat || 0}g
                    </span>
                </div>
            </div>
        `;

        // Add click handlers for macro items
        dayEntry.querySelectorAll('.macro-item').forEach(item => {
            item.addEventListener('click', () => {
                const macroType = item.dataset.macro;
                const currentValue = parseInt(item.dataset.value) || 0;
                showMacroEditModal(macroType, currentValue, dayId);
            });
        });

        dietContainer.appendChild(dayEntry);
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Update skincare button handlers
let selectedRoutine = null;
let selectedDay = null;

document.querySelectorAll('.skincare-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const dayEntry = e.target.closest('.day-entry');
        const dayDate = dayEntry.querySelector('.day-date').textContent;
        selectedDay = dayDate;
        selectedRoutine = null;
        
        const overlay = document.getElementById('skincare-selection-overlay');
        const timeInput = overlay.querySelector('.skincare-time-input');
        const confirmBtn = overlay.querySelector('.skincare-confirm');
        
        timeInput.style.display = 'none';
        confirmBtn.style.display = 'none';
        
        overlay.classList.add('active');
    });
});

// Handle skincare item selection
document.querySelectorAll('.skincare-item').forEach(item => {
    item.addEventListener('click', () => {
        const type = item.dataset.type;
        selectedRoutine = type;
        
        const timeInput = document.querySelector('.skincare-time-input');
        const confirmBtn = document.querySelector('.skincare-confirm');
        
        if (type === 'Face Wash') {
            timeInput.style.display = 'block';
            confirmBtn.style.display = 'block';
        } else {
            // For other types, save immediately and close modal
            addSkincareRoutine(type);
            document.getElementById('skincare-selection-overlay').classList.remove('active');
        }
    });
});

// Handle time confirmation
document.querySelector('.skincare-confirm').addEventListener('click', () => {
    const timeInput = document.getElementById('skincare-time');
    if (timeInput.value) {
        addSkincareRoutine(selectedRoutine, timeInput.value);
        document.getElementById('skincare-selection-overlay').classList.remove('active');
    }
});

function addSkincareRoutine(type, time = null) {
    const dayEntry = Array.from(document.querySelectorAll('.day-entry'))
        .find(entry => entry.querySelector('.day-date').textContent === selectedDay);
    
    if (dayEntry) {
        // Remove any existing routines
        const existingRoutine = dayEntry.querySelector('.skincare-routine-tag');
        if (existingRoutine) {
            existingRoutine.remove();
        }
        
        // Create new routine tag
        const routineTag = document.createElement('div');
        routineTag.className = 'skincare-routine-tag';
        routineTag.innerHTML = `
            ${type}
            ${time ? `<span class="skincare-routine-time">(${time})</span>` : ''}
        `;
        
        // Insert after day-date
        dayEntry.querySelector('.day-date').insertAdjacentElement('afterend', routineTag);
    }
}

// Close skincare selection when clicking outside or cancel button
document.getElementById('skincare-selection-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'skincare-selection-overlay' || 
        e.target.classList.contains('skincare-cancel')) {
        document.getElementById('skincare-selection-overlay').classList.remove('active');
        // Reset fields
        document.querySelector('.skincare-time-input').style.display = 'none';
        document.querySelector('.skincare-confirm').style.display = 'none';
        document.getElementById('skincare-time').value = '';
    }
});

// Add measurement button handler
const addMeasurementBtn = document.getElementById('add-measurement-btn');
if (addMeasurementBtn) {
    addMeasurementBtn.addEventListener('click', () => {
        showMeasurementModal();
    });
}

function showMeasurementModal(existingData = null) {
    const modal = document.createElement('div');
    modal.className = 'stats-modal active';
    
    modal.innerHTML = `
        <div class="stats-container">
            <h3 style="margin-top: 0; margin-bottom: 20px;">
                ${existingData ? 'Edit Measurement' : 'Add New Measurement'}
            </h3>
            <div class="form-group">
                <select class="measurement-type-select" style="width: 100%; padding: 8px; margin-bottom: 15px;">
                    <option value="weight">Weight (kg)</option>
                    <option value="chest">Chest (cm)</option>
                    <option value="waist">Waist (cm)</option>
                    <option value="hips">Hips (cm)</option>
                    <option value="biceps">Biceps (cm)</option>
                    <option value="thighs">Thighs (cm)</option>
                    <option value="calves">Calves (cm)</option>
                </select>
                <input type="number" class="measurement-value-input stats-input" 
                       placeholder="Enter value" step="0.1"
                       value="${existingData ? existingData.value : ''}">
            </div>
            <div class="stats-actions">
                <button class="calendar-cancel">Cancel</button>
                <button class="calendar-confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const typeSelect = modal.querySelector('.measurement-type-select');
    if (existingData) {
        typeSelect.value = existingData.type;
    }

    modal.querySelector('.calendar-confirm').addEventListener('click', () => {
        const type = typeSelect.value;
        const value = modal.querySelector('.measurement-value-input').value;

        if (!value || value <= 0) {
            showNotification('Please enter a valid value', 'error');
            return;
        }

        saveMeasurement({
            type,
            value: parseFloat(value),
            date: new Date().toISOString(),
            id: existingData ? existingData.id : Date.now()
        });

        modal.remove();
        updateMeasurementsList();
    });

    modal.querySelector('.calendar-cancel').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function saveMeasurement(measurement) {
    const userId = auth.currentUser.uid;
    let measurements = JSON.parse(localStorage.getItem(`measurements_${userId}`) || '[]');
    
    const index = measurements.findIndex(m => m.id === measurement.id);
    if (index !== -1) {
        measurements[index] = measurement;
    } else {
        measurements.push(measurement);
    }
    
    localStorage.setItem(`measurements_${userId}`, JSON.stringify(measurements));
    showNotification('Measurement saved successfully!', 'success');
}

function updateMeasurementsList() {
    const userId = auth.currentUser.uid;
    const measurements = JSON.parse(localStorage.getItem(`measurements_${userId}`) || '[]');
    const container = document.querySelector('.measurements-container');
    if (!container) return;

    container.innerHTML = '';
    
    const measurementTypes = {
        weight: 'Weight',
        chest: 'Chest',
        waist: 'Waist',
        hips: 'Hips',
        biceps: 'Biceps',
        thighs: 'Thighs',
        calves: 'Calves'
    };

    measurements.sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach((measurement) => {
            const entry = document.createElement('div');
            entry.className = 'measurement-entry';
            
            const date = new Date(measurement.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            entry.innerHTML = `
                <div class="measurement-info">
                    <div class="measurement-type">${measurementTypes[measurement.type]}</div>
                    <div class="measurement-value">${measurement.value} ${measurement.type === 'weight' ? 'kg' : 'cm'}</div>
                    <div class="measurement-date">${formattedDate}</div>
                </div>
                <div class="measurement-actions">
                    <button class="edit-measurement" data-id="${measurement.id}">
                        <img src="images/edit.png" alt="Edit">
                    </button>
                    <button class="delete-measurement" data-id="${measurement.id}">
                        <img src="images/trash.png" alt="Delete">
                    </button>
                </div>
            `;

            container.appendChild(entry);
        });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-measurement').forEach(btn => {
        btn.addEventListener('click', () => {
            const measurementId = parseInt(btn.dataset.id);
            const measurement = measurements.find(m => m.id === measurementId);
            if (measurement) {
                showMeasurementModal(measurement);
            }
        });
    });

    document.querySelectorAll('.delete-measurement').forEach(btn => {
        btn.addEventListener('click', () => {
            const measurementId = parseInt(btn.dataset.id);
            const newMeasurements = measurements.filter(m => m.id !== measurementId);
            localStorage.setItem(`measurements_${userId}`, JSON.stringify(newMeasurements));
            updateMeasurementsList();
            showNotification('Measurement deleted successfully!', 'success');
        });
    });
}

// Call updateMeasurementsList when switching to measurements section
const origSwitchSection = switchSection;
switchSection = function(sectionId) {
    origSwitchSection(sectionId);
    if (sectionId === 'measurements') {
        updateMeasurementsList();
    }
};

// Measurement card functionality
document.querySelectorAll('.measurement-item').forEach(item => {
    item.addEventListener('click', () => {
        const measurementType = item.dataset.measurement;
        const cardType = item.closest('.measurement-card').dataset.type;
        const currentValue = parseFloat(item.querySelector('.value').textContent);
        
        openMeasurementModal(measurementType, cardType, currentValue, item);
    });
});

function openMeasurementModal(type, cardType, currentValue, itemElement) {
    const modal = document.querySelector('.measurement-edit-modal');
    const input = modal.querySelector('.measurement-input');
    const title = modal.querySelector('.modal-title');
    const unit = type === 'weight' ? 'kg' : 'cm';

    title.textContent = `Edit ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    input.value = currentValue;
    input.setAttribute('data-type', type);
    input.setAttribute('data-card', cardType);

    modal.classList.add('active');
    lockBodyScroll();

    // Save button handler
    const saveBtn = modal.querySelector('.modal-save');
    const saveHandler = () => {
        const newValue = parseFloat(input.value);
        if (!isNaN(newValue) && newValue >= 0) {
            // Save to localStorage
            const userId = auth.currentUser.uid;
            const measurementData = JSON.parse(localStorage.getItem(`measurements_${userId}_${cardType}`) || '{}');
            measurementData[type] = newValue;
            localStorage.setItem(`measurements_${userId}_${cardType}`, JSON.stringify(measurementData));

            // Update display
            itemElement.querySelector('.value').textContent = `${newValue} ${unit}`;
            
            // Update difference if this is a before/after measurement
            if (cardType !== 'difference') {
                updateDifference(type);
            }

            // Close modal
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    };
    saveBtn.addEventListener('click', saveHandler, { once: true });

    // Cancel button handler
    const cancelBtn = modal.querySelector('.modal-cancel');
    const cancelHandler = () => {
        modal.classList.remove('active');
        unlockBodyScroll();
    };
    cancelBtn.addEventListener('click', cancelHandler, { once: true });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });
}

// Add this function to load saved measurements
function loadMeasurements() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const types = ['before', 'after'];
    types.forEach(type => {
        const data = JSON.parse(localStorage.getItem(`measurements_${userId}_${type}`) || '{}');
        Object.entries(data).forEach(([measurement, value]) => {
            const element = document.querySelector(
                `.measurement-card[data-type="${type}"] .measurement-item[data-measurement="${measurement}"] .value`
            );
            if (element) {
                const unit = measurement === 'weight' ? 'kg' : 'cm';
                element.textContent = `${value} ${unit}`;
                updateDifference(measurement);
            }
        });
    });
}

// Call this after auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        loadMeasurements();
    }
});

// Helper: lock/unlock body scroll when modal is open
function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
}
function unlockBodyScroll() {
    document.body.style.overflow = '';
}

// Measurement modal logic
(function setupMeasurementModal() {
    const modal = document.getElementById('measurement-edit-modal');
    const input = modal.querySelector('.measurement-input');
    const title = modal.querySelector('.modal-title');
    let currentItem = null;
    let currentType = '';
    let currentCard = '';

    // Open modal
    document.querySelectorAll('.measurement-item').forEach(item => {
        item.addEventListener('click', () => {
            currentItem = item;
            currentType = item.dataset.measurement;
            currentCard = item.closest('.measurement-card').dataset.type;
            const currentValue = parseFloat(item.querySelector('.value').textContent) || 0;
            const unit = currentType === 'weight' ? 'kg' : 'cm';
            title.textContent = `Edit ${currentType.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}`;
            input.value = currentValue;
            input.setAttribute('data-type', currentType);
            input.setAttribute('data-card', currentCard);
            modal.classList.add('active');
            lockBodyScroll();
            input.focus();
        });
    });

    // Save
    modal.querySelector('.modal-save').onclick = function() {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val >= 0 && currentItem) {
            const unit = currentType === 'weight' ? 'kg' : 'cm';
            currentItem.querySelector('.value').textContent = `${val} ${unit}`;
            updateDifference(currentType);
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    };

    // Cancel
    modal.querySelector('.modal-cancel').onclick = function() {
        modal.classList.remove('active');
        unlockBodyScroll();
    };

    // Close on overlay click (but not when clicking the container)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('active') && e.key === 'Escape') {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // Update difference card
    window.updateDifference = function(type) {
        // Get before and after values
        const beforeElem = document.querySelector('.measurement-card[data-type="before"] .measurement-item[data-measurement="' + type + '"] .value');
        const afterElem = document.querySelector('.measurement-card[data-type="after"] .measurement-item[data-measurement="' + type + '"] .value');
        const diffElem = document.querySelector('.measurement-card[data-type="difference"] .measurement-item[data-measurement="' + type + '"] .value');
        if (!beforeElem || !afterElem || !diffElem) return;

        // Parse values (strip units)
        const beforeVal = parseFloat((beforeElem.textContent || '').replace(/[^\d.-]/g, '')) || 0;
        const afterVal = parseFloat((afterElem.textContent || '').replace(/[^\d.-]/g, '')) || 0;
        const diff = afterVal - beforeVal;

        // Determine unit
        const unit = type === 'weight' ? 'kg' : 'cm';

        // Format difference
        let diffText = '';
        let diffClass = '';
        if (diff > 0) {
            diffText = `+${diff.toFixed(1)} ${unit}`;
            diffClass = 'positive';
        } else if (diff < 0) {
            diffText = `${diff.toFixed(1)} ${unit}`;
            diffClass = 'negative';
        } else {
            diffText = `0 ${unit}`;
            diffClass = '';
        }

        // Animate only if value changed
        if (diffElem.textContent !== diffText) {
            diffElem.classList.remove('diff-animate');
            // Force reflow for restart animation
            void diffElem.offsetWidth;
            diffElem.textContent = diffText;
            diffElem.className = `value ${diffClass} diff-animate`;
        } else {
            diffElem.textContent = diffText;
            diffElem.className = `value ${diffClass}`;
        }
    };
})();

// Add Pictures functionality
document.getElementById('add-picture-btn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                showCropModal(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
});

function showCropModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'crop-modal';
    
    modal.innerHTML = `
        <div class="crop-container">
            <h3>Adjust Image</h3>
            <div class="crop-area">
                <img src="${imageUrl}" id="crop-image">
            </div>
            <div class="crop-controls">
                <div class="control-group">
                    <label>Zoom</label>
                    <input type="range" id="zoom-range" min="0.5" max="3" step="0.1" value="1">
                </div>
                <div class="control-group">
                    <label>Rotation</label>
                    <input type="range" id="rotation-range" min="-180" max="180" step="1" value="0">
                </div>
                <div class="aspect-ratios">
                    <button class="aspect-btn active" data-ratio="1">1:1</button>
                    <button class="aspect-btn" data-ratio="4/3">4:3</button>
                    <button class="aspect-btn" data-ratio="16/9">16:9</button>
                    <button class="aspect-btn" data-ratio="free">Free</button>
                </div>
            </div>
            <div class="crop-actions">
                <button class="cancel-crop">Cancel</button>
                <button class="save-crop">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 0);

    const cropImage = document.getElementById('crop-image');
    let cropper = new Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        modal: true,
        guides: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
    });

    // Zoom control
    document.getElementById('zoom-range').addEventListener('input', (e) => {
        cropper.zoomTo(parseFloat(e.target.value));
    });

    // Rotation control
    document.getElementById('rotation-range').addEventListener('input', (e) => {
        cropper.rotateTo(parseFloat(e.target.value));
    });

    // Aspect ratio buttons
    document.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ratio = btn.dataset.ratio;
            cropper.setAspectRatio(ratio === 'free' ? NaN : eval(ratio));
        });
    });

    // Cancel button
    modal.querySelector('.cancel-crop').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    // Save button
    modal.querySelector('.save-crop').addEventListener('click', () => {
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 800,    // Max width
            height: 800,   // Max height
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        const croppedImageData = croppedCanvas.toDataURL('image/jpeg', 0.9);
        
        // Close crop modal
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            showPictureInfoModal(croppedImageData, imageUrl);
        }, 300);
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

function showPictureInfoModal(croppedImageData, originalImageData) {
    const modal = document.querySelector('.picture-info-modal');
    const form = document.getElementById('picture-info-form');
    
    modal.classList.add('active');

    form.onsubmit = (e) => {
        e.preventDefault();
        
        const comparisonType = form.querySelector('input[name="comparison-type"]:checked').value;
        const bodyType = document.getElementById('body-picture-type').value;
        const age = document.getElementById('picture-age').value;

        const userId = auth.currentUser.uid;
        let pictures = JSON.parse(localStorage.getItem(`pictures_${userId}`) || '[]');
        
        const newPicture = {
            id: Date.now(),
            croppedData: croppedImageData,
            originalData: originalImageData,
            comparisonType,
            bodyType,
            age,
            date: new Date().toISOString()
        };
        
        pictures.unshift(newPicture);
        localStorage.setItem(`pictures_${userId}`, JSON.stringify(pictures));
        
        modal.classList.remove('active');
        updatePicturesGrid();
        showNotification('Picture added successfully!', 'success');
    };

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function updatePicturesGrid() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const gridContainer = document.querySelector('.pictures-grid');
    if (!gridContainer) return;

    // Create before/after containers if they don't exist
    gridContainer.innerHTML = `
        <div class="before-pictures"></div>
        <div class="after-pictures"></div>
    `;

    const beforeContainer = gridContainer.querySelector('.before-pictures');
    const afterContainer = gridContainer.querySelector('.after-pictures');

    const pictures = JSON.parse(localStorage.getItem(`pictures_${userId}`) || '[]');
    
    pictures.forEach((picture, index) => {
        const card = document.createElement('div');
        card.className = 'picture-card';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="picture-container">
                <img src="${picture.croppedData}" alt="Body progress picture" class="preview-trigger" data-original="${picture.originalData}">
            </div>
            <div class="picture-info">
                <div class="picture-details">
                    <div class="picture-type">${picture.bodyType}</div>
                    <div class="picture-age">Age: ${picture.age}</div>
                    <div class="picture-date">${new Date(picture.date).toLocaleDateString()}</div>
                </div>
                <div class="picture-actions">
                    <button class="delete-picture" data-id="${picture.id}">
                        <img src="images/trash.png" alt="Delete">
                    </button>
                </div>
            </div>
        `;

        // Add click handler for image preview
        const image = card.querySelector('.preview-trigger');
        image.addEventListener('click', () => {
            showImagePreview(picture.originalData);
        });

        // Add delete handler
        card.querySelector('.delete-picture').addEventListener('click', () => {
            pictures = pictures.filter(p => p.id !== picture.id);
            localStorage.setItem(`pictures_${userId}`, JSON.stringify(pictures));
            updatePicturesGrid();
            showNotification('Picture deleted successfully!', 'success');
        });

        // Add to appropriate container
        if (picture.comparisonType === 'before') {
            beforeContainer.appendChild(card);
        } else {
            afterContainer.appendChild(card);
        }
    });
}

function showImagePreview(imageUrl) {
    // Create modal if it doesn't exist
    let modal = document.querySelector('.image-preview-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'image-preview-modal';
        document.body.appendChild(modal);
    }

    // Set modal content
    modal.innerHTML = `<img src="${imageUrl}" alt="Full size preview" class="preview-image">`;
    
    // Show modal
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    // Close on click
    modal.addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
}

// Update the switchSection function to include pictures section update
const originalSwitchSection = switchSection;
switchSection = function(sectionId) {
    originalSwitchSection(sectionId);
    if (sectionId === 'pictures') {
        updatePicturesGrid();
    }
};

/* ...existing code... */

// Update the sidebar button handlers to include right sidebar buttons
document.querySelectorAll('.sidebar-btn, .right-sidebar .sidebar-btn').forEach(button => {
    button.addEventListener('click', () => {
        const sectionId = button.dataset.section;
        switchSection(sectionId);
        
        // Update active states for both sidebars
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Close the appropriate sidebar
        if (button.closest('.right-sidebar')) {
            toggleRightSidebar();
        } else {
            toggleSidebar();
        }
    });
});

/* ...existing code... */

// ...existing code...

function exportUserData() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        showNotification('Please login first', 'error');
        return;
    }

    // Collect all user data from localStorage
    const userData = {};
    
    // Collect all keys first to properly process them
    const keysToExport = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Include any key containing user ID or fixed schedule data
        if (key.includes(userId) || key.includes('fixed_workouts_') || 
            (key.includes('workoutStats_') && key.includes('fixed_')) ||
            (key.includes('workoutTimes_') && key.includes('fixed_'))) {
            keysToExport.push(key);
        }
    }
    
    // Process all collected keys
    keysToExport.forEach(key => {
            userData[key] = localStorage.getItem(key);
    });

    // Create blob and download file
    const dataStr = JSON.stringify(userData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `betterlife_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showNotification('Data exported successfully!', 'success');
}

function importUserData(file) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        showNotification('Please login first', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate imported data
            if (!Object.keys(importedData).some(key => key.includes('_'))) {
                throw new Error('Invalid data format');
            }

            // First identify the source user ID in the imported data
            let sourceUserId = null;
            for (const key of Object.keys(importedData)) {
                if (key.includes('_')) {
                    const parts = key.split('_');
                    for (const part of parts) {
                        // User IDs are typically long strings
                        if (part.length > 20) {
                            sourceUserId = part;
                            break;
                        }
                    }
                    if (sourceUserId) break;
                }
            }

            if (!sourceUserId) {
                showNotification('Could not identify user data in import file', 'error');
                return;
            }

            // Clear existing user data
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key.includes(userId)) {
                    localStorage.removeItem(key);
                }
            }

            // Import new data
            Object.entries(importedData).forEach(([key, value]) => {
                // Replace source user ID with current user ID
                const newKey = key.replace(sourceUserId, userId);
                localStorage.setItem(newKey, value);
            });

            showNotification('Data imported successfully!', 'success');
            // Refresh the page to show imported data
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            showNotification('Invalid data file', 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}

// Add event listeners for the data buttons
document.querySelectorAll('.data-button').forEach(button => {
    button.addEventListener('click', (e) => {
        if (e.target.id === 'export-data') {
            exportUserData();
        } else if (e.target.id === 'import-data') {
            // Create and trigger file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    importUserData(file);
                }
            };
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        }
    });
});

// ...existing code...

/* ...existing code... */

// Add this near the top of your event listener
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    setupProfileEditing();
});

function setupProfileEditing() {
    const editModal = document.querySelector('.edit-profile-modal');
    const editInput = document.getElementById('edit-field');
    let currentField = null;
    let currentValue = null;

    // Add click handlers for edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            const valueSpan = document.getElementById(field);
            currentField = field;
            currentValue = valueSpan.textContent;
            
            editInput.value = currentValue;
            editModal.classList.add('active');
            editInput.focus();
        });
    });

    // Cancel button handler
    document.querySelector('.edit-cancel').addEventListener('click', () => {
        editModal.classList.remove('active');
    });

    // Save button handler
    document.querySelector('.edit-save').addEventListener('click', () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !currentField) return;

        const newValue = editInput.value.trim();
        if (!newValue) return;

        // Update the display
        document.getElementById(currentField).textContent = newValue;

        // Update localStorage
        let data = {};
        switch(currentField) {
            case 'firstName':
            case 'secondName':
            case 'lastName':
                data = JSON.parse(localStorage.getItem(`name_${userId}`) || '{}');
                data[currentField] = newValue;
                localStorage.setItem(`name_${userId}`, JSON.stringify(data));
                break;
            case 'height':
            case 'weight':
            case 'bmr':  // Add BMR case
                data = JSON.parse(localStorage.getItem(`physique_${userId}`) || '{}');
                data[currentField] = newValue;
                localStorage.setItem(`physique_${userId}`, JSON.stringify(data));
                break;
            case 'age':
                data = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
                data.birthdate = newValue; // Note: You might want to handle date conversion
                localStorage.setItem(`birth_${userId}`, JSON.stringify(data));
                break;
            // Add more cases as needed
        }

        editModal.classList.remove('active');
        showNotification('Profile updated successfully!', 'success');
    });

    // Close modal when clicking outside
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.remove('active');
        }
    });

    // Load initial data
    function loadProfileData() {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const nameData = JSON.parse(localStorage.getItem(`name_${userId}`) || '{}');
        const physiqueData = JSON.parse(localStorage.getItem(`physique_${userId}`) || '{}');
        const birthData = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
        const accountData = JSON.parse(localStorage.getItem(`account_${userId}`) || '{}');

        // Update display
        document.getElementById('firstName').textContent = nameData.firstName || '--';
        document.getElementById('secondName').textContent = nameData.secondName || '--';
        document.getElementById('lastName').textContent = nameData.lastName || '--';
        document.getElementById('userEmail').textContent = accountData.email || '--';
        document.getElementById('height').textContent = physiqueData.height || '--';
        document.getElementById('weight').textContent = physiqueData.weight || '--';
        document.getElementById('bmr').textContent = physiqueData.bmr || '--';
        document.getElementById('age').textContent = calculateAge(birthData.birthdate) || '--';
        // Add more fields as needed
    }

    // Call loadProfileData when auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadProfileData();
        }
    });
}

function calculateAge(birthdate) {
    if (!birthdate) return '--';
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age.toString();
}

/* ...existing code... */

// Add this after your document.addEventListener('DOMContentLoaded', () => {
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Logout modal functionality
    const logoutModal = document.querySelector('.logout-modal');
    const logoutCancel = document.querySelector('.logout-cancel');
    const logoutConfirm = document.querySelector('.logout-confirm');

    // Add click handler for logout button
    document.querySelector('[data-section="logout"]').addEventListener('click', () => {
        logoutModal.classList.add('active');
        setTimeout(() => logoutModal.querySelector('.logout-container').style.opacity = '1', 10);
    });

    logoutCancel.addEventListener('click', () => {
        logoutModal.querySelector('.logout-container').style.opacity = '0';
        setTimeout(() => logoutModal.classList.remove('active'), 300);
    });

    logoutConfirm.addEventListener('click', () => {
        // Clear all localStorage data
        localStorage.clear();
        
        // Clear all sessionStorage data
        sessionStorage.clear();
        
        // Clear any cookies (optional, depends on your needs)
        document.cookie.split(";").forEach(cookie => {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Reload the page
        window.location.reload();
    });

    // Close modal when clicking outside
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
            logoutModal.querySelector('.logout-container').style.opacity = '0';
            setTimeout(() => logoutModal.classList.remove('active'), 300);
        }
    });

    // ...existing code...
});

// ...existing code...

// ...existing code...

// Add logout button in data section
const rightSidebar = document.querySelector('.right-sidebar');
const logoutBtn = document.createElement('button');
logoutBtn.className = 'sidebar-btn';
logoutBtn.innerHTML = `
    <span class="btn-emoji">🚪</span>
    <span class="btn-text">Logout</span>
`;
rightSidebar.appendChild(logoutBtn);

// Logout modal functionality
const logoutModal = document.querySelector('.logout-modal');

logoutBtn.addEventListener('click', () => {
    logoutModal.classList.add('active');
});

document.querySelector('.logout-cancel').addEventListener('click', () => {
    logoutModal.classList.remove('active');
});

document.querySelector('.logout-confirm').addEventListener('click', () => {
    // Clear all localStorage items
    localStorage.clear();
    
    // Clear all sessionStorage items
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach(cookie => {
        document.cookie = cookie
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    
    // Refresh the page
    window.location.reload();
});

// Close modal when clicking outside
logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
        logoutModal.classList.remove('active');
    }
});

// ...existing code...

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Add schedule type toggle functionality
    const scheduleTypeToggle = document.querySelector('.schedule-type-toggle');
    const normalScheduleContainer = document.querySelector('.normal-schedule-container');
    const fixedScheduleContainer = document.querySelector('.fixed-schedule-container');
    const normalAddBtn = document.querySelector('.normal-schedule-container #add-schedule-btn');
    const fixedAddBtn = document.querySelector('.fixed-schedule-container #add-schedule-btn');
    
    scheduleTypeToggle.addEventListener('click', () => {
        const isNormal = scheduleTypeToggle.textContent === 'Normal';
        scheduleTypeToggle.textContent = isNormal ? 'Fixed' : 'Normal';
        scheduleTypeToggle.classList.toggle('fixed');
        
        normalScheduleContainer.style.display = isNormal ? 'none' : 'block';
        fixedScheduleContainer.style.display = isNormal ? 'block' : 'none';

        // Toggle button states
        normalAddBtn.classList.toggle('disabled');
        fixedAddBtn.classList.toggle('disabled');
    });

    // Only add click handler to normal schedule button
    normalAddBtn.addEventListener('click', () => {
        scheduleOverlay.classList.add('active');
        updateCalendar();
    });

    // ...existing code...
});

// ...existing code...

// ...existing code...

// Add after calendar functionality
const FIXED_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function initializeFixedSchedule() {
    const fixedContainer = document.querySelector('.fixed-schedule-container');
    const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
    
    fixedContainer.innerHTML = `
        <div class="days-container">
            ${FIXED_DAYS.map(day => `
                <div class="day-entry${day === currentDay ? ' current-day' : ''}" data-day="${day.toLowerCase()}">
                    <div class="day-main-content">
                        <div class="day-date">${day}</div>
                        <div class="day-actions">
                            <div class="day-status">Scheduled</div>
                            <button class="day-add-workout" data-day="${day.toLowerCase()}" title="Add workout">
                                <div class="plus-icon"></div>
                            </button>
                        </div>
                    </div>
                    <div class="day-workouts" id="fixed-${day.toLowerCase()}-workouts"></div>
                </div>
            `).join('')}
        </div>
    `;

    // Add click handlers for add workout buttons
    fixedContainer.querySelectorAll('.day-add-workout').forEach(btn => {
        btn.addEventListener('click', () => {
            const dayId = btn.dataset.day;
            handleFixedDayWorkout(dayId);
        });
    });
}

function handleFixedDayWorkout(day) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
    if (userWorkouts.length === 0) {
        showNotification('Add some workouts first in the Workouts section!', 'error');
        return;
    }

    // Get existing workouts for this day
    const fixedWorkouts = JSON.parse(localStorage.getItem(`fixed_workouts_${userId}`) || '{}');
    const existingWorkouts = new Set((fixedWorkouts[day] || []).map(w => w.name));

    // Create and show workout selection dialog
    const dialog = document.createElement('div');
    dialog.className = 'workout-selection-overlay active';
    dialog.innerHTML = `
        <div class="workout-selection-container" style="opacity: 1; transform: translateY(0);">
            <h2>Select Workout for ${day.charAt(0).toUpperCase() + day.slice(1)}</h2>
            <div class="workouts-list">
                ${userWorkouts.map(workout => `
                    <div class="workout-item ${existingWorkouts.has(workout.name) ? 'disabled' : ''}" 
                         data-workout='${JSON.stringify({name: workout.name, type: workout.type})}'>
                        <span>${workout.name}</span>
                        <small>(${workout.type})</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Handle workout selection
    dialog.querySelectorAll('.workout-item:not(.disabled)').forEach(item => {
        item.addEventListener('click', () => {
            const workoutData = JSON.parse(item.dataset.workout);
            saveFixedWorkout(workoutData.name, workoutData.type, day);
            dialog.remove();
        });
    });

    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

// ...existing code...

function saveFixedWorkout(workout, category, dayId) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const workoutData = {
        id: Date.now(),
        name: workout,  // Store the workout name directly
        type: category,
        day: dayId
    };

    const fixedWorkouts = JSON.parse(localStorage.getItem(`fixed_workouts_${userId}`) || '{}');
    if (!fixedWorkouts[dayId]) {
        fixedWorkouts[dayId] = [];
    }
    fixedWorkouts[dayId].push(workoutData);
    localStorage.setItem(`fixed_workouts_${userId}`, JSON.stringify(fixedWorkouts));
    
    // Initialize empty stats and times for this workout
    // Use a format that will be recognized by the export/import functions
    localStorage.setItem(`workoutStats_${userId}_fixed_${dayId}_${workoutData.id}`, JSON.stringify(null));
    localStorage.setItem(`workoutTimes_${userId}_fixed_${dayId}_${workoutData.id}`, JSON.stringify({}));

    // Update the display
    const workoutsContainer = document.getElementById(`fixed-${dayId}-workouts`);
    createWorkoutTag(workoutData, workoutsContainer, `fixed_${dayId}`);
}

function updateFixedScheduleDisplay() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const fixedWorkouts = JSON.parse(localStorage.getItem(`fixed_workouts_${userId}`) || '{}');
    
    FIXED_DAYS.forEach(day => {
        const dayId = day.toLowerCase();
        const workoutsContainer = document.getElementById(`fixed-${dayId}-workouts`);
        if (!workoutsContainer) return;

        workoutsContainer.innerHTML = '';
        
        if (fixedWorkouts[dayId]) {
            fixedWorkouts[dayId].forEach(workout => {
                // Pass the stored workout data directly to createWorkoutTag with the fixed_ prefix
                createWorkoutTag(workout, workoutsContainer, `fixed_${dayId}`);
            });
        }
    });
}

// Modify the existing workout selection handler
document.addEventListener('click', (e) => {
    if (e.target.matches('.workout-item')) {
        const workout = e.target.textContent;
        const category = e.target.closest('.workout-category').querySelector('.category-title').textContent;
        
        const context = JSON.parse(localStorage.getItem('currentScheduleContext'));
        
        if (context.type === 'fixed') {
            const success = saveFixedWorkout(workout, category, context.day);
            if (success) {
                showNotification('Workout added to fixed schedule!', 'success');
            } else {
                showNotification('Workout already exists for this day', 'error');
            }
        } else {
            // Existing normal schedule logic
            // ...existing code...
        }
        
        document.getElementById('workout-selection-overlay').classList.remove('active');
    }
});

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    initializeFixedSchedule();
    
    // Add toggle handler for schedule type
    const scheduleTypeToggle = document.querySelector('.schedule-type-toggle');
    scheduleTypeToggle.addEventListener('click', () => {
        const isNormal = scheduleTypeToggle.textContent === 'Normal';
        const normalContainer = document.querySelector('.normal-schedule-container');
        const fixedContainer = document.querySelector('.fixed-schedule-container');

        scheduleTypeToggle.textContent = isNormal ? 'Fixed' : 'Normal';
        scheduleTypeToggle.classList.toggle('fixed');
        
        normalContainer.style.display = isNormal ? 'none' : 'block';
        fixedContainer.style.display = isNormal ? 'block' : 'none';
    });
});

// ...existing code...

// Remove old click handler if it exists
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    const scheduleTypeToggle = document.querySelector('.schedule-type-toggle');
    const normalScheduleContainer = document.querySelector('.normal-schedule-container');
    const fixedScheduleContainer = document.querySelector('.fixed-schedule-container');

    // Initialize fixed schedule if it hasn't been done
    if (!fixedScheduleContainer.innerHTML.trim()) {
        initializeFixedSchedule();
    }

    // Make sure toggle button exists
    if (scheduleTypeToggle) {
        scheduleTypeToggle.addEventListener('click', () => {
            const isNormal = scheduleTypeToggle.textContent === 'Normal';
            
            // Update button text and style
            scheduleTypeToggle.textContent = isNormal ? 'Fixed' : 'Normal';
            scheduleTypeToggle.classList.toggle('fixed');
            
            // Toggle containers' visibility
            normalScheduleContainer.style.display = isNormal ? 'none' : 'block';
            fixedScheduleContainer.style.display = isNormal ? 'block' : 'none';
            
            // Update button states
            const scheduleBtn = document.getElementById('add-schedule-btn');
            if (scheduleBtn) {
                scheduleBtn.classList.toggle('disabled', isNormal);
            }

            // Refresh the display for the active container
            if (isNormal) {
                updateFixedScheduleDisplay();
            } else {
                updateScheduleDisplay();
            }
        });
    }
    
    // ...existing code...
});

// ...existing code...

// Add after the document.addEventListener('DOMContentLoaded', function() {

// Random symbols animation
const symbols = ['!@#$%', '&*()_', '+=-~`', '}{":?', '><,./'];
const randomSymbolsElements = document.querySelectorAll('.random-symbols, .random-title-symbols');

function updateRandomSymbols() {
    const randomIndex = Math.floor(Math.random() * symbols.length);
    randomSymbolsElements.forEach(element => {
        if (element) {
            element.textContent = symbols[randomIndex];
        }
    });
}

// Start the animation
setInterval(updateRandomSymbols, 25);  // Changed from 100ms to 25ms

// Add this to the existing section content area
const randomSection = document.createElement('div');
randomSection.className = 'section-content';
randomSection.setAttribute('data-section', 'random');
randomSection.innerHTML = `
    <div class="random-centered-container">
        <h2 class="random-title-symbols">?????</h2>
    </div>
`;
document.querySelector('.selection-area').appendChild(randomSection);

// ... existing code ...

// Handle black overlay for random section
const blackOverlay = document.querySelector('.black-overlay');

// Handle random button click
document.querySelector('.random-symbols-btn').addEventListener('click', function() {
    // Show the black overlay
    blackOverlay.classList.add('active');
    
    // Ensure the random section is active
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(section => section.classList.remove('active'));
    document.querySelector('.section-content[data-section="random"]').classList.add('active');
});

// ... existing code ...

function createStars() {
    const blackOverlay = document.querySelector('.black-overlay');
    const numberOfStars = 50;
    const existingStars = blackOverlay.querySelectorAll('.star');
    
    // Remove existing stars
    existingStars.forEach(star => star.remove());

    // Create new stars
    for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Random animation delay and duration
        const delay = Math.random() * 2;
        const duration = 3 + Math.random() * 2;
        star.style.animation = `starTrail ${duration}s ${delay}s infinite`;
        
        blackOverlay.appendChild(star);
    }
}

// Modify the existing random section click handler
document.querySelector('.random-symbols-btn').addEventListener('click', function() {
    const blackOverlay = document.querySelector('.black-overlay');
    blackOverlay.classList.add('active');
    
    // Create stars immediately
    createStars();
    
    // Recreate stars periodically for continuous effect
    const starInterval = setInterval(createStars, 5000);
    
    // Create scary text with delay
    setTimeout(() => {
        const scaryText = document.createElement('div');
        scaryText.className = 'scary-text';
        scaryText.textContent = 'Huh......';
        scaryText.style.position = 'fixed';
        scaryText.style.top = '50%';
        scaryText.style.left = '50%';
        scaryText.style.transform = 'translate(-50%, -50%) translateZ(0)';
        scaryText.style.zIndex = '9999';
        document.body.appendChild(scaryText);
    }, 1500);
    
    // Clean up when clicking anywhere
    const cleanup = () => {
        blackOverlay.classList.remove('active');
        clearInterval(starInterval);
        const scaryText = document.querySelector('.scary-text');
        if (scaryText) {
            scaryText.remove();
        }
        document.removeEventListener('click', cleanup);
    };
    
    // Add cleanup listener with delay to prevent immediate triggering
    setTimeout(() => {
        document.addEventListener('click', cleanup);
    }, 2000);
});

// ... existing code ...

// Dark Mode Functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// Check for saved dark mode preference
const darkMode = localStorage.getItem('darkMode');
if (darkMode === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.checked = true;
}

// Toggle dark mode
darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
});
