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

const firstBtn = document.getElementById('FirstBtn');
const pinBtn = document.getElementById('PinBtn');
const deleteBtn = document.getElementById('DeleteBtn');

let pin_index = 0;
let chatInput = document.getElementById('ChatInput');

// pour le type module, les variables globales ne sont pas accessibles directement, il faut les definir en dehors
let posts = [];
let search = [];
let len = 0;
let filter_tag = [];
let filter_title = [];
let filter_description = [];
let filteredPosts = [];

let currentOpenedPostId = null;

// --- DECLARATION DES VARIABLES POUR FIREBASE ---
const db = getFirestore(app);
const postsCol = collection(db, "posts");

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
            const Comments = document.getElementsByClassName('user-comment');
            if (Comments.length > 0) {
                Comments[Comments.length - 1].scrollIntoView();
            }
            scrollToPinned()
        });
    });
}

async function deleteComment(post, comment) {
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
        .replace(/"""C\+\+([\s\S]*?)"""/g, '<pre class="language-html"><code>$1</code></pre>')
        .replace(/"""SQL([\s\S]*?)"""/g, '<pre class="language-sql"><code>$1</code></pre>')
        .replace(/"""JAVA([\s\S]*?)"""/g, '<pre class="language-java"><code>$1</code></pre>')
        .replace(/"""Java([\s\S]*?)"""/g, '<pre class="language-java"><code>$1</code></pre>')
        .replace(/"""JSON([\s\S]*?)"""/g, '<pre class="language-json"><code>$1</code></pre>')
        // .replace(/"""([\s\S]*?)"""/g, '<pre class="language-clike"><code>$1</code></pre>');

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
function showOverlay(post) {
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
                           
                        <button class="delete-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z"/></svg>
                        </button>
                        
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
    overlay.style.display = "flex";
    pin_index = 0;

    const commentDeleteBtns = PostPreview.querySelectorAll('.delete-btn');
    commentDeleteBtns.forEach((btn, index) => {
        btn.onclick = () => {
            deleteComment(post, post.comments[index]);
        };
    });
    
    const pinDeleteBtns = PostPreview.querySelectorAll('.pin-btn');
    pinDeleteBtns.forEach((btn, index) => {
        btn.onclick = () => {
            pinComment(post, index);
        };
    });

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

    deleteBtn.onclick = () => deletePost(post);
    
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
    const newPost = {
        title: Title.value,
        description: Content.value,
        tags: [],
        user: "Anonyme", 
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
    if (chatInput.value.trim() === "") return;
    const postRef = doc(postsCol, post.id)
    const newComment = {
        user: "Anonyme",
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
}

async function deletePost(post) {
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

// ----------------------------------------------------------------------
// ---------- Fonctions de d'interaction sans données (static) ----------
// ----------------------------------------------------------------------

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
    if (e.target === overlay) {
        hideOverlay()
    }
});