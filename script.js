// ---------------------------------------------------------------------- 
// -------------- Structure DataBase (Stockage de données) --------------
// ----------------------------------------------------------------------

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    runTransaction,
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc,
    updateDoc, 
    arrayUnion,
    arrayRemove,
    doc,
    query,
    where,
    getDoc,
    getDocs,
    deleteField,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAeWTHiHdMERbIYQJZQwpxFvKpkFu5Vg_I",
  authDomain: "help-center-17ae6.firebaseapp.com",
  databaseURL: "https://help-center-17ae6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "help-center-17ae6",
  storageBucket: "help-center-17ae6.firebasestorage.app",
  messagingSenderId: "547035302717",
  appId: "1:547035302717:web:58842a846b6af30df41354",
  measurementId: "G-GZZZSCPCSZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ----------------------------------------------------------------------
// ------------------- Script Entier De l'Application -------------------
// ----------------------------------------------------------------------

// --- DECLARATION DES VARIABLES POUR L'APPLICATION ---
const postsContainer = document.getElementById('PostsContainer');
const input = document.getElementById('SearchInput');
const newPostBtn = document.getElementById('NewPost');
const newPostForm = document.getElementById('NewPostForm');
const searchBar = document.getElementById('Searchbar');
const titleInput = document.getElementById('Title');
const closeFormBtn = document.getElementById('NewPostForm_svg');
const textarea = document.getElementById('Content');
const PostBtn = document.getElementById('Post');

const PostPreview = document.getElementById('PostPreview');
const overlay = document.getElementById("PostOverlay");
const closeBTN = document.getElementById("CloseOverlay")

const firstBtn = document.getElementById('FirstBtn');
const pinBtn = document.getElementById('PinBtn');
const deleteBtn = document.getElementById('DeleteBtn');

let pin_index = 0;
let chatInput = document.getElementById('ChatInput');
let isTyping = false;

const Name = document.getElementById('Name')
const PWD = document.getElementById('Password')
const PWDV = document.getElementById('PasswordVerif')
const SeePWD = document.getElementById('SeePassword')
const SeePWDV = document.getElementById('SeePasswordVerif')
const SignUpBtn = document.getElementById('SignUp')
const LoginBtn = document.getElementById('LogIn')

const AdminMenu = document.getElementById('AdminMenu')

// Login
let isLoggedIn = false;
const NameDisplay = document.getElementById('Name_Display')

// pour le type module, les variables globales ne sont pas accessibles directement, il faut les definir en dehors
let posts = [];
let search = [];
let len = 0;
let filter_tag = [];
let filter_title = [];
let filter_description = [];
let filteredPosts = [];
let onCooldown = false

let currentOpenedPostId = null;

// --- DECLARATION DES VARIABLES POUR FIREBASE ---
const db = getFirestore(app);
const postsCol = collection(db, "posts");

function startApp() {
    // ------------------------------- 

    // Récupération des données depuis le fichier JSON

    // fetch('post.json?v=' + Date.now())
    //   .then(response => response.json())
    //   .then(data => {
    //     posts = data;
    //     renderPosts(input);
    //   })
    //   .catch(error => console.error('Erreur:', error));

    // Récupération des données depuis Firebase Firestore
    onSnapshot(postsCol, (snapshot) => {
        adminMenu();
        if (!checkSession()) return;

        // On transforme les documents Firebase en tableau JS
        posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log("Données Firebase chargées :", posts);
        renderPosts(input); // On affiche quand les données changent

        if (currentOpenedPostId) {
            const updatedPost = posts.find(p => p.id === currentOpenedPostId);
            if (updatedPost) {
                const commentsContainer = PostPreview.querySelector('.comments');
                const scrollPos = commentsContainer ? commentsContainer.scrollTop : 0;

                showOverlay(updatedPost);
            
                const newCommentsContainer = PostPreview.querySelector('.comments');
                if (newCommentsContainer) {
                    newCommentsContainer.scrollTop = scrollPos;
                }
            }
        }
    });

    // ----------------------------------------------------------------------
    // -------------------- Fonctions de Rendu (Render) ---------------------
    // ----------------------------------------------------------------------

    // Par défaut, on cache l'overlay
    overlay.style.display = "none";

    // (render) Fonction de rendu des posts
    function renderPosts(inp) {
        search = inp.value.toLowerCase().trim().split(/\s+/);
        postsContainer.innerHTML = '';
        len = search.length
        filter_tag = posts.filter(post => search
        .some(word => post.tags
        .some(tag => tag.toLowerCase().includes(word))))

        filter_title = posts.filter(post => search
        .filter(word => post.title.toLowerCase().includes(word)).length >= len - Math.round(len/3))

        filter_description = posts.filter(post => search
        .filter(word => post.description.toLowerCase().includes(word)).length >= len - Math.round(len/3))

        filteredPosts = [...filter_tag, ...filter_title.filter(post => !filter_tag.includes(post))];
        console.log(filteredPosts)
        filteredPosts.forEach((post) => {
            const postElement = document.createElement('article');
            postElement.classList.add('post-preview');
            if (post.status) {
                postElement.classList.add(`border-${post.status}`);
            }
            postElement.innerHTML = `
                <div class="post-header">
                    <h2>${cleanHTML(post.title)}</h2>
                    <span class="status status-${post.status || 'pending'}">
                        ${post.status === 'success' ? 'Résolu' : 'En attente'}
                    </span>
                </div>
                <p>${formatComment(post.description)}</p>
                <div class="post-footer">
                    <span class="tags"><span class="user"><strong>${cleanHTML(post.user)}</strong></span>${post.tags.map(tag => `<span class="tag">${cleanHTML(tag)}</span>`).join('')}</span>
                </div>`;
            postsContainer.appendChild(postElement);
            postElement.addEventListener('click', () => {
                showOverlay(post);  
                overlay.style.display = "flex";   
                const Comments = document.getElementsByClassName('user-comment');
                if (Comments.length > 0) {
                    Comments[Comments.length - 1].scrollIntoView();
                }
                scrollToPinned()
            });
        });
    }

    async function deleteComment(post, comment) {
        if (!checkSession()) return;

        if (confirm("Voulez-vous vraiment supprimer ce commentaire ?")) {
        
            const postRef = doc(postsCol, post.id)

            try {
                await updateDoc(postRef, {
                    comments: arrayRemove(comment)
                })
            }
            catch (error) {
                alert("Erreur lors de la suppression du commentaire : " + error.message);
            }
        }
    }

    async function pinComment(post, commentIndex) {

        const postRef = doc(postsCol, post.id)

        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) return;

                const currentComments = postDoc.data().comments;

                currentComments[commentIndex].pinned = !currentComments[commentIndex].pinned

                transaction.update(postRef, {comments: currentComments});
            });
        }
        catch (error) {
            alert("Erreur lors du pin du commentaire : " + error.message);
        }
    }

    function cleanHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
    function formatComment(str) {

        let clean = cleanHTML(str)
            .replace(/"""JS([\s\S]*?)"""/g, '<pre class="language-javascript"><code>$1</code></pre>')
            .replace(/"""CSS([\s\S]*?)"""/g, '<pre class="language-css"><code>$1</code></pre>')
            .replace(/"""HTML([\s\S]*?)"""/g, '<pre class="language-html"><code>$1</code></pre>')
            .replace(/"""PY([\s\S]*?)"""/g, '<pre class="language-python"><code>$1</code></pre>')
            .replace(/"""Py([\s\S]*?)"""/g, '<pre class="language-py"><code>$1</code></pre>')
            .replace(/"""C([\s\S]*?)"""/g, '<pre class="language-css"><code>$1</code></pre>')
            .replace(/"""C\+\+([\s\S]*?)"""/g, '<pre class="language-cpp"><code>$1</code></pre>')
            .replace(/"""SQL([\s\S]*?)"""/g, '<pre class="language-sql"><code>$1</code></pre>')
            .replace(/"""JAVA([\s\S]*?)"""/g, '<pre class="language-java"><code>$1</code></pre>')
            .replace(/"""Java([\s\S]*?)"""/g, '<pre class="language-java"><code>$1</code></pre>')
            .replace(/"""JSON([\s\S]*?)"""/g, '<pre class="language-json"><code>$1</code></pre>')

            clean = clean.replace(/"""([\s\S]*?)"""/g, (match, code) => {
            let language = "clike"; // Par défaut

            // Détection JS : si on voit let, const, function, =>, ou console.log
            if (code.match(/\b(let|const|function|console|var|if \(|return|addEventListener|getElement|document.)\b/)) {
                language = "javascript";
            }
            // Détection HTML : si on voit des balises comme <div>, <html>, <!DOCTYPE...
            else if (code.match(/&lt;[a-z!]/i)) {
                language = "markup"; // "markup" est le nom pour HTML dans Prism
            } 
            // Détection CSS : si on voit des propriétés avec : et ;
            else if (code.match(/[a-z-]+\s*:\s*[^;]+;/i) || code.match(/.[a-z-]+\s+{([\s\S]*?)\}/)) {
                language = "css";
            }

            return `<pre class="language-${language}"><code>${code}</code></pre>`;
            });

            // 3. On traite les autres formatages
        clean = clean.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([\s\S]*?)\*/g, '<em>$1</em>')
                    .replace(/__([\s\S]*?)__/g, '<u>$1</u>');

        // 4. On ajoute les <br> UNIQUEMENT si ce n'est pas à l'intérieur d'un <pre>
        // Mais il y a plus simple : utiliser le CSS pour le texte normal aussi !
        return clean;
    }

    // (render) Affichage de l'overlay d'un post
    async function showOverlay(post) {

        const oldChatInput = document.getElementById('ChatInput');
        let savedValue = "";
        if (oldChatInput) {savedValue = oldChatInput.value}

        isTyping = !!(oldChatInput && document.activeElement === oldChatInput);
        console.log('before : ' + isTyping)

        checkSession()
        const userId = sessionStorage.getItem('userId');
        const snap = await getDoc(doc(db, "users", userId));
        const currentUser = sessionStorage.getItem('username');
        currentOpenedPostId = post.id;
        PostPreview.innerHTML = ` 
                    <div class="post-header">
                        <h2 class="full">${cleanHTML(post.title)}</h2>
                        <span id="Status" class="status status-${post.status || 'pending'}">
                        ${post.status === 'success' ? 'Résolu' : 'En attente'}</span>
                    </div>
                    
                    <div class="comments">

                    <p class="full as-comment">${formatComment(post.description)}</p>
                    
                        ${post.comments.map(comment => `<div class="user-comment ${comment.pinned ? 'pinned' : ''}">
                            
                            <button class="pin-btn")">
                                ${comment.pinned ? '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="var(--accent)"><path d="M680-840v80h-40v327l-80-80v-247H400v87l-87-87-33-33v-47h400ZM480-40l-40-40v-240H240v-80l80-80v-46L56-792l56-56 736 736-58 56-264-264h-6v240l-40 40ZM354-400h92l-44-44-2-2-46 46Zm126-193Zm-78 149Z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="m640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Zm-286 80h252l-46-46v-314H400v314l-46 46Zm126 0Z"/></svg>'}
                            </button>

                            <article class="comment-content">
                                <span class="user"><strong>${cleanHTML(comment.user)}</strong></span>
                                <p>${formatComment(comment.content)}</p>
                            </article>
                            
                            ${checkSession() && comment.user === currentUser || snap.data().superAdmin || snap.data().admin ? `
                            <button class="delete-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z"/></svg>
                            </button>
                            ` : ''}
                        </div>`).join('')}
                    </div>
                    <div class="chat">
                        <textarea id="ChatInput" placeholder="Écrivez votre message ici..."></textarea>
                        <button id="SendBtn">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/></svg>
                        </button>
                    </div>
                    <div class="post-footer">
                        <span class="tags"><span class="user"><strong>${cleanHTML(post.user)}</strong></span>${post.tags.map(tag => `<span class="tagg">${cleanHTML(tag)}</span>`).join('')}</span>
                    </div>
                `;

        // on affiche l'overlay
        // overlay.style.display = "flex";
        pin_index = 0;

        const chatIpt = document.getElementById('ChatInput');
        chatIpt.value = savedValue

        const commentDeleteBtns = PostPreview.querySelectorAll('.delete-btn');
        // À l'intérieur de showOverlay(post)
        commentDeleteBtns.forEach((btn, index) => {
            btn.onclick = async () => {
                if (!checkSession()) return;

                try {
                    // Ici, on utilise post (l'objet complet de l'overlay)
                    const commentToDelete = post.comments[index];
                    
                    const userId = sessionStorage.getItem('userId');
                    const userSnap = await getDoc(doc(db, "users", userId));
                    const userData = userSnap.data();

                    // Vérification des droits
                    if (commentToDelete.user === userData.username || userData.admin || userData.superAdmin) {
                        // APPEL CORRIGÉ : On passe l'objet 'post' et le 'comment'
                        await deleteComment(post, commentToDelete);
                        
                        // Petit hack visuel : on cache le commentaire immédiatement
                        btn.closest('.user-comment').style.display = 'none';
                    } else {
                        alert("Action non autorisée");
                    }
                } catch (error) {
                    console.error("Erreur dans le bouton supprimer :", error);
                }
            };
        });
        
        const pinDeleteBtns = PostPreview.querySelectorAll('.pin-btn');
        pinDeleteBtns.forEach((btn, index) => {
            btn.onclick = () => {
                if (!checkSession()) return;
                pinComment(post, index);
            };
        });

        if (isTyping) {
            console.log("focus plss")
            chatIpt.focus();
            chatIpt.selectionStart = chatIpt.selectionEnd = chatIpt.value.length;
        }

        /* suppression
        deleteBtn.onclick = () => {
            if (confirm("Voulez-vous vraiment supprimer ce post ?")) {
                const postIndex = posts.indexOf(post); 
                
                if (postIndex !== -1) {
                    posts.splice(postIndex, 1);
                    overlay.style.display = "none";
                    renderPosts(input);
                }
            }
        }; */

        /* let deleteBtns = document.getElementsByClassName('delete-btn');
        Array.from(deleteBtns).forEach((btn, index) => {
            btn.addEventListener('click', () => {
                post.comments.splice(index, 1);
                showOverlay(post);
            });
        }); */

        /* let pinBtns = document.getElementsByClassName('pin-btn');
        Array.from(pinBtns).forEach((btn, index) => {
            btn.addEventListener('click', () => {
                post.comments[index].pinned = !post.comments[index].pinned;
                showOverlay(post);
            });0
        }); */

        const Status = document.getElementById('Status');

        let chatInput = document.getElementById('ChatInput');
        chatInput.addEventListener("input", () => {
            chatInput.style.height = "auto";
            chatInput.style.height = chatInput.scrollHeight + "px";
            chatInput.style.maxHeight = "40dvh";
        });
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                postComment(post, chatInput);
            }
        });

        let SendBtn = document.getElementById('SendBtn');
        SendBtn.addEventListener('click', () => postComment(post, chatInput));

        Status.addEventListener('click', () => statusChange(Status, post));

        deleteBtn.classList.add('hidden')
        if (checkSession() && post.user === currentUser || snap.data().superAdmin || snap.data().admin) {deleteBtn.onclick = () => deletePost(post); deleteBtn.classList.remove('hidden')}

        Prism.highlightAll();
    }

    // ----------------------------------------------------------------------
    // ----------- Fonctions de d'interaction avec données (data) -----------
    // ----------------------------------------------------------------------

    // (data) Création d'un post et ajout à la base de données

    /* Structure without any db
    function createPost() {
        posts.push({
            title: Title.value,
            description: Content.value,
            tags: [],
            user: "Anonyme", 
            status: "pending",
            comments: []
        });
        Content.value = '';
        renderPosts(input);
        closeForm('');
    }*/

    async function createPost() {
        if (!checkSession()) return;
        if (onCooldown) return;
        const newPost = {
            title: Title.value,
            description: Content.value,
            tags: [],
            user: sessionStorage.getItem('username'), 
            status: "pending",
            comments: []
        };

        try {
            await addDoc(postsCol, newPost)
            Content.value = '';
            closeForm('');
            console.log("Post enregistré avec succès !");
        }
        catch (error) {
            alert("Erreur lors de l'envoi : " + error.message);
        }

        onCooldown=true
        SendBtn.classList.add('cooldown')
        setTimeout(() => {
            onCooldown=false
            SendBtn.classList.remove('cooldown')
        }, 4000);
    };

    // (data) Changement du statut d'un post
    /* Structure without any db and without push
    function statusChange(Status, post) {
        if (Status.classList.contains('status-success')) {
            Status.classList.remove('status-success');
            Status.classList.add('status-pending');
            Status.textContent = 'En attente';
        } else {
            Status.classList.remove('status-pending');
            Status.classList.add('status-success');
            Status.textContent = 'Résolu';
        }
    } */

    async function statusChange(Status, post) {
        if (!checkSession()) return;
        const postRef = doc(postsCol, post.id);
        const newStatus = post.status === 'success' ? 'pending' : 'success'

        try {
            await updateDoc(postRef,{
                status: newStatus
            });
        }
        catch (error) {
            alert("Erreur lors du changement de status : " + error.message);
        }
    }

    // (data) Ajout d'un commentaire à un post
    /* Structure without any db
    function postComment(post, chatInput) {
        if (chatInput.value.trim() === "") return;
        post.comments.push({
            user: "Anonyme",
            content: chatInput.value,
            pinned: false
        });
        chatInput.value = "";
        showOverlay(post);
    } */

    async function postComment(post, chatInput) {
        if (!checkSession()) return;
        if (onCooldown) return;
        if (chatInput.value.trim() === "") return;
        const postRef = doc(postsCol, post.id)
        const newComment = {
            user: sessionStorage.getItem("username"),
            content: chatInput.value,
            pinned: false,
            date: new Date()
        };
        try {
            await updateDoc(postRef, {
                comments: arrayUnion(newComment)
            }) 
            chatInput.value = "";
            const Comments = document.getElementsByClassName('user-comment');
            if (Comments.length > 0) {
                Comments[Comments.length - 1].scrollIntoView({behavior: 'smooth'});
            }
        }
        catch (error) {
            alert("Erreur lors de l'envois du commentaire : " + error.message);
        }

        document.getElementById("ChatInput").value = ""
        onCooldown=true
        SendBtn.classList.add('cooldown')
        setTimeout(() => {
            onCooldown=false
            SendBtn.classList.remove('cooldown')
        }, 4000);
    }

    async function deletePost(post) {
        if (!checkSession()) return;

        if (confirm("Voulez-vous VRAIMENT supprimer ce POST ? ")) {
            const postRef = doc(postsCol, post.id)

            try {
                await deleteDoc(postRef)
                hideOverlay()
            }
            catch (error) {
                alert("Erreur lors de la suppression du post : " + error.message);
            }
        }
    }

    async function updateHeartbeat() {
        const userId = sessionStorage.getItem('userId');
        const token = sessionStorage.getItem('token');

        if (userId && token) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                lastSeen: Date.now() // On enregistre le timestamp actuel
            });
        }
    }

    // Envoyer un signe de vie toutes les 5 minutes
    setInterval(updateHeartbeat, 5 * 60 * 1000);
    // Appeler une fois au démarrage
    updateHeartbeat();

    function checkAutomaticLogout() {
        const loginTime = sessionStorage.getItem('loginTime');
        const oneHour = 60 * 60 * 1000; // 1 heure en millisecondes

        if (loginTime && (Date.now() - loginTime > oneHour)) {
            alert("Votre session a expiré (limite d'une heure).");
            disconnect(); // Ta fonction qui vide le token et reload
        }
    }

    // On vérifie toutes les minutes pour la limite d'une heure
    setInterval(checkAutomaticLogout, 60000);

    // ----------------------------------------------------------------------
    // ---------- Fonctions de d'interaction sans données (static) ----------
    // ----------------------------------------------------------------------

    NameDisplay.innerHTML = sessionStorage.getItem('username')
    // (static) Affichage la zone de création de post 
    function writePosts() {

        const title = input.value.trim();
        searchBar.classList.add('hidden');
        newPostForm.classList.remove('hidden');
        Title.value = title;
        Title.focus();
    }

    // (static) Fermeture de la zone de création de post
    function closeForm(str) {
        const title = Title.value.trim();
        newPostForm.classList.add('hidden');
        searchBar.classList.remove('hidden');
        input.value = (str !== undefined) ? str : title;
        input.focus();
        renderPosts(input);
    }

    // (static) Scrolls
    function scrollToFirst() {
        if (document.getElementsByClassName('as-comment')[0]){
            document.getElementsByClassName('as-comment')[0].scrollIntoView({ behavior: 'smooth' });
        }
    }
    function scrollToPinned() {
        if (document.getElementsByClassName('pinned').length === 0) return;
        document.getElementsByClassName('pinned')[pin_index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        pin_index = (pin_index + 1) % document.getElementsByClassName('pinned').length;
    }
    function hideOverlay() {
        overlay.style.display = "none";
        renderPosts(input)
    }
    // ----------------------------------------------------------------------
    // -------------------------- Events (event) ----------------------------
    // ----------------------------------------------------------------------

    // (event) Gestion des événements
    newPostBtn.addEventListener('click', () => writePosts());
    closeFormBtn.addEventListener('click', () => closeForm());
    titleInput.addEventListener('input', () => renderPosts(titleInput));
    input.addEventListener('input', () => renderPosts(input));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            writePosts();
            textarea.focus();
        }
    });
    PostBtn.addEventListener('click', () => createPost());
    textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.maxHeight = "68dvh";
    });
    firstBtn.addEventListener('click', scrollToFirst);
    pinBtn.addEventListener('click', scrollToPinned);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target === document.getElementById("Utils")) {
            hideOverlay()
        }
    });
    closeBTN.addEventListener('click', () => {
        hideOverlay()
    });

    async function checkAdminPrivileges() {
        const userId = sessionStorage.getItem('userId');
        const snap = await getDoc(doc(db, "users", userId));
        return snap.exists() && (snap.data().admin || snap.data().superAdmin);
    }

    window.toggleMute = async (targetUid, currentStatus) => {
        if (!(await checkAdminPrivileges())) return alert("Action interdite");
        await updateDoc(doc(db, "users", targetUid), { isMuted: !currentStatus });
        adminMenu(); // Rafraîchit le menu
    };

    window.toggleBan = async (targetUid, currentStatus) => {
        // Seul un Super Admin devrait pouvoir Ban (Sécurité supplémentaire)
        const userId = sessionStorage.getItem('userId');
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.data().superAdmin) return alert("Privilèges Super Admin requis");

        await updateDoc(doc(db, "users", targetUid), { 
            isBanned: !currentStatus,
            sessionToken: null // On force la déconnexion si banni
        });
        adminMenu();
    };

    window.promoteAdmin = async (targetUid, isCurrentlyAdmin) => {
        const userId = sessionStorage.getItem('userId');
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.data().superAdmin) return alert("Action réservée au Super Admin");

        await updateDoc(doc(db, "users", targetUid), { admin: !isCurrentlyAdmin });
        adminMenu();
    };

    window.deleteAllContent = async (targetUsername) => {
        const userId = sessionStorage.getItem('userId');
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.data().superAdmin) return alert("Privilèges Super Admin requis");

        if (!(await checkAdminPrivileges())) return;
        if (!confirm(`Supprimer tout le contenu de ${targetUsername} ?`)) return;

        // 1. Supprimer les posts
        const postsQ = query(collection(db, "posts"), where("user", "==", targetUsername));
        const postsSnap = await getDocs(postsQ);
        postsSnap.forEach(async (d) => await deleteDoc(d.ref));

        // 2. Supprimer les commentaires
        // (Si tes commentaires sont dans une collection globale)
        const commsQ = query(collection(db, "comments"), where("user", "==", targetUsername));
        const commsSnap = await getDocs(commsQ);
        commsSnap.forEach(async (d) => await deleteDoc(d.ref));

        alert("Nettoyage effectué");
        adminMenu();
    };

    const adminBTN = document.getElementById('AdminToggleBtn')
    adminBTN.addEventListener('click', () => {
        document.getElementById('AdminOverlay').classList.remove('hidden');
    });

    async function adminMenu() {
        const userId = sessionStorage.getItem('userId');
        if (!userId) return;

        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.admin === true || userData.superAdmin === true) {
                
                // Afficher l'overlay
                // document.getElementById('AdminOverlay').classList.remove('hidden');
                adminBTN.classList.remove('hidden');

                const usersQuery = await getDocs(collection(db, "users"));
                let userRows = "";

                usersQuery.forEach((uDoc) => {
                    const u = uDoc.data();
                    const uId = uDoc.id;
                    const isOnline = u.sessionToken ? "🟢" : "🔴";
                    const role = u.superAdmin ? "Super Admin" : (u.admin ? "Admin" : "User");
                    
                    // On utilise tes classes CSS : tagg, btn, delete, first...
                    userRows += `
                        <tr>
                            <td style="padding:10px">${isOnline} <strong>${u.username}</strong></td>
                            <td><span class="tagg ${u.admin ? 'first' : ''}">${role}</span></td>
                            <td>
                                <button class="tagg" onclick="window.toggleMute('${uId}', ${u.isMuted || false})">
                                    ${u.isMuted ? 'Mute 🤐' : 'Mute'}
                                </button>
                                ${userData.superAdmin ? `
                                    <button class="tagg delete" onclick="window.deleteAllContent('${u.username}')">Wipe</button>
                                    <button class="tagg ${u.isBanned ? 'first' : 'delete'}" onclick="window.toggleBan('${uId}', ${u.isBanned || false})">
                                        ${u.isBanned ? 'Unban' : 'Ban'}
                                    </button>
                                    <button class="tagg" onclick="window.promoteAdmin('${uId}', ${u.admin || false})">
                                        Admin +/-
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });

                document.getElementById('AdminContent').innerHTML = `
                    <table style="width:100%; text-align:left; border-spacing: 0 10px;">
                        <thead>
                            <tr style="color:var(--text-muted); font-size:0.8rem">
                                <th>USER</th>
                                <th>RANG</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>${userRows}</tbody>
                    </table>
                `;
            }
        }
    };

    document.getElementById('CloseAdmin').onclick = () => {
        document.getElementById('AdminOverlay').classList.add('hidden');
    };

    adminMenu()
}

async function checkSession() {
    const localToken = sessionStorage.getItem('token')
    const userId = sessionStorage.getItem('userId');

    if (!localToken || !userId) {
        disconnect();
        return false;
    }

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    
    if (userSnap.exists()) {
        const lastSeen = userSnap.data().lastSeen;
        const fiveMinutes = 5 * 60 * 1000;

        if (Date.now() - lastSeen > fiveMinutes) {
            disconnect();
            return false;
        }

        const dbToken = userSnap.data().sessionToken;

        if (!dcodeIO.bcrypt.compareSync(localToken, dbToken)) {
            alert("Session corrompue ou une autre session est ouverte.");
            disconnect();
            return false;
        }
        return true;
    } else {
        disconnect();
        return false;
    }
}

SeePWD.addEventListener('click', (e) => e.preventDefault())
SeePWD.addEventListener('mousedown', (e) => {e.preventDefault() ; PWD.type = "text"; SeePWD.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z"/></svg>'})
SeePWD.addEventListener('mouseup', (e) => {e.preventDefault() ; PWD.type = "password"; SeePWD.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>'})
SeePWD.addEventListener('mouseout', (e) => {e.preventDefault() ; PWD.type = "password"; SeePWD.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>'})

SeePWDV.addEventListener('click', (e) => e.preventDefault())
SeePWDV.addEventListener('mousedown', (e) => {e.preventDefault() ; PWDV.type = "text"; SeePWDV.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z"/></svg>'})
SeePWDV.addEventListener('mouseup', (e) => {e.preventDefault() ; PWDV.type = "password"; SeePWDV.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>'})
SeePWDV.addEventListener('mouseout', (e) => {e.preventDefault() ; PWDV.type = "password"; SeePWDV.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>'})

SignUpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    SignUp()
})

LoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    Login()
})

async function SignUp() {
    const username = Name.value.replaceAll("-", "_").replaceAll(" ", "_").toLowerCase().replaceAll(/_+/gm, "_").replaceAll(/^_|_$/gm, "");
    const password = PWD.value;

    // Validation basique
    if (!/^[a-zA-Z0-9_]{3,}$/.test(username)) {Name.classList.add('wrong'); return};
    if (password !== PWDV.value) {PWDV.classList.add('wrong'); return};
    if (password.length < 4) {PWD.classList.add('wrong'); return};

    const userRef = doc(db, "users", username);

    try {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);

            if (userSnap.exists()) {
                throw new Error("USERNAME_TAKEN");
            }

            // Hashing
            const salt = dcodeIO.bcrypt.genSaltSync(10);
            const hashedPassword = dcodeIO.bcrypt.hashSync(password, salt);

            transaction.set(userRef, {
                username: username,
                pwd: hashedPassword,
                createdAt: Date.now()
            });
        });

        Login();

    } catch (error) {
        if (error.message === "USERNAME_TAKEN") {
            Name.classList.add('wrong');
        } else {
            alert("Erreur lors du sign up : " + error.message);
        }
    }
}
async function connect() {
    isLoggedIn = true;

    document.getElementById('Register').style.display = 'none';
    document.getElementById('MainContent').style.display = 'block';

    startApp(); 
}

window.onload = () => {
    console.log('loading')
    if (sessionStorage.getItem('authenticated') === 'true') {
        console.log('authenticated')

        let check = checkSession()
        if(check) {
            console.log('session checked')
            connect();
        }
    }
};

function hashToken(Token) {
    const salt = dcodeIO.bcrypt.genSaltSync(10);
    const hashedToken = dcodeIO.bcrypt.hashSync(Token, salt);
    return hashedToken
}

let timeout = false

// TODO : ajouter les class wrong et les suppr après modif
// faire en sorte que l'oeil marche sur tel

async function Login() {
    if(timeout) return;

    const username = Name.value.replaceAll("-", "_").replaceAll(" ", "_").toLowerCase().replaceAll(/_+/gm, "_").replaceAll(/^_|_$/gm, "");
    const password = PWD.value;

    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.isBanned) {
            alert("Ce compte est banni.");
            return; // On bloque l'accès
        }

        if (dcodeIO.bcrypt.compareSync(password, userData.pwd)) {
            const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            // On met à jour le token dans la DB
            await updateDoc(doc(db, "users", userDoc.id), {
                sessionToken: hashToken(newToken)
            });

            // On stocke tout en local
            sessionStorage.setItem('token', newToken);
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('userId', userDoc.id);
            sessionStorage.setItem('authenticated', 'true');
            sessionStorage.setItem('loginTime', Date.now());

            connect();
        }
        else {
            PWD.classList.add('wrong')
            timeout = true
            setTimeout(() => { timeout = false; }, 1000);

        }
    }
    else{
        Name.classList.add('wrong')
    }
}

const SignMethod = document.getElementById('SignMethod')

function ChangeSignMethod(e) {
    e.preventDefault()
    
    const p = document.getElementById('PWD_label')
    const a = document.getElementById('SignMethod')

    document.getElementById('SignUpInputs').classList.toggle('hidden')
    document.getElementById('LoginInputs').classList.toggle('hidden')
    
    if (p.textContent.trim() === "Enter your password :") {
        p.textContent = "Create your password :"
        a.textContent = "Already have an account ? : Login"
    }
    else {
        p.textContent = "Enter your password :"
        a.textContent = "No account ? : Create an account"
    }
}
SignMethod.addEventListener('click', (e) => ChangeSignMethod(e))

async function disconnect() {

    await updateDoc(
        doc(db, "users", sessionStorage.getItem("userId")),
        {
            sessionToken: deleteField()
        }
    );
    isLoggedIn = false;
    sessionStorage.clear()
    location.reload();
}

document.getElementById('Disconnect').addEventListener('click', () => disconnect())

PWD.addEventListener('input', () => {
    PWD.classList.remove('wrong')
    PWDV.classList.remove('wrong')
})
PWDV.addEventListener('input', () => {
    PWDV.classList.remove('wrong')
});
Name.addEventListener('input', () => {
    PWD.classList.remove('wrong')
    Name.classList.remove('wrong')
});