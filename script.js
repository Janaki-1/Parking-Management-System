// script.js - shared for all pages (auth, storage, search dataset, bookings, payment simulation, autosuggest)

document.addEventListener("DOMContentLoaded", () => {
  // ---------- storage helpers ----------
  const storage = {
    getUsers(){ return JSON.parse(localStorage.getItem("sp_users") || "[]"); },
    setUsers(u){ localStorage.setItem("sp_users", JSON.stringify(u)); },
    getCurrent(){ return JSON.parse(localStorage.getItem("sp_current") || "null"); },
    setCurrent(u){ localStorage.setItem("sp_current", JSON.stringify(u)); },
    clearCurrent(){ localStorage.removeItem("sp_current"); },
    getBookings(){ return JSON.parse(localStorage.getItem("sp_bookings") || "[]"); },
    setBookings(b){ localStorage.setItem("sp_bookings", JSON.stringify(b)); }
  };

  // ---------- demo parking data ----------
  const parkingData = [
    { id:"P001", name: "Alappuzha Bus Stand Parking", location:"Alappuzha", type:"paid", price: 120, img:"https://images.unsplash.com/photo-1519160558534-5796a6ced2a9?q=80&w=1200&auto=format&fit=crop" },
    { id:"P002", name: "City Mall Parking (Lulu)", location:"Ernakulam", type:"paid", price: 150, img:"https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop" },
    { id:"P003", name: "Marine Drive Open Parking", location:"Ernakulam", type:"free", price: 0, img:"https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1200&auto=format&fit=crop" },
    { id:"P004", name: "Technopark Parking", location:"Thiruvananthapuram", type:"paid", price: 100, img:"https://images.unsplash.com/photo-1509395176047-4a66953fd231?q=80&w=1200&auto=format&fit=crop" },
    { id:"P005", name: "Beach Road Parking", location:"Kollam", type:"free", price: 0, img:"https://images.unsplash.com/photo-1501621965065-c6e1cf6b53e2?q=80&w=1200&auto=format&fit=crop" },
    { id:"P006", name: "Sakthan Market Parking", location:"Thrissur", type:"paid", price: 80, img:"https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop" },
    { id:"P007", name: "Railway Station Parking", location:"Kottayam", type:"paid", price: 60, img:"https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop" },
    { id:"P008", name: "Calicut Beach Parking", location:"Kozhikode", type:"free", price: 0, img:"https://images.unsplash.com/photo-1504198453319-5ce911bafcde?q=80&w=1200&auto=format&fit=crop" }
  ];

  // ---------- helpers ----------
  function escapeHtml(s){ return (s+"").replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function generateBookingId(){ return "BK" + Date.now().toString(36).toUpperCase().slice(-8) + Math.floor(Math.random()*90+10); }

  function saveBooking(ticket){
    const all = storage.getBookings();
    all.unshift(ticket);
    storage.setBookings(all);
    const users = storage.getUsers();
    const cur = storage.getCurrent();
    if(cur){
      const idx = users.findIndex(u => u.email === cur.email);
      if(idx >= 0){
        users[idx].bookings = users[idx].bookings || [];
        users[idx].bookings.unshift(ticket);
        storage.setUsers(users);
        storage.setCurrent(users[idx]);
      }
    }
  }

  // ---------- common UI auth wiring (for nav UI in every page) ----------
  (function wireNavAuth(){
    const navAuth = document.getElementById("nav-auth");
    const navLogged = document.getElementById("nav-logged");
    const welcomeUser = document.getElementById("welcomeUser");
    const btnLogout = document.getElementById("btn-logout");

    function updateAuthUI(){
      const cur = storage.getCurrent();
      if(cur && navAuth && navLogged && welcomeUser){
        navAuth.classList.add("d-none");
        navLogged.classList.remove("d-none");
        welcomeUser.textContent = Hello, ${cur.name};
      } else if(navAuth && navLogged && welcomeUser){
        navAuth.classList.remove("d-none");
        navLogged.classList.add("d-none");
        welcomeUser.textContent = "";
      }
    }
    if(btnLogout){
      btnLogout.addEventListener("click", () => {
        storage.clearCurrent();
        updateAuthUI();
        // redirect to home after logout
        window.location.href = "index.html";
      });
    }
    updateAuthUI();
  })();

  // ---------- page-specific wiring ----------
  const path = window.location.pathname.split("/").pop();

  // --- Signup page ---
  if(path === "signup.html"){
    const signupForm = document.getElementById("signupForm");
    const signupAlert = document.getElementById("signupAlert");
    if(signupForm){
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        signupAlert.classList.add("d-none");
        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim().toLowerCase();
        const pass = document.getElementById("signupPassword").value;
        if(!name || !email || !pass){ signupAlert.textContent = "All fields required"; signupAlert.classList.remove("d-none"); return; }
        const users = storage.getUsers();
        if(users.find(u => u.email === email)){ signupAlert.textContent = "Email already used"; signupAlert.classList.remove("d-none"); return; }
        const newUser = { name, email, password: pass, bookings: [] };
        users.push(newUser);
        storage.setUsers(users);
        storage.setCurrent(newUser);
        // redirect to find page after signup
        window.location.href = "find.html";
      });
    }
  }

  // --- Login page ---
  if(path === "login.html"){
    const loginForm = document.getElementById("loginForm");
    const loginAlert = document.getElementById("loginAlert");
    if(loginForm){
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        loginAlert.classList.add("d-none");
        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const pass = document.getElementById("loginPassword").value;
        const users = storage.getUsers();
        const user = users.find(u => u.email === email && u.password === pass);
        if(!user){ loginAlert.textContent = "Invalid credentials"; loginAlert.classList.remove("d-none"); return; }
        storage.setCurrent(user);
        // redirect to find page after login
        window.location.href = "find.html";
      });
    }
  }

  // --- Find page: autosuggest, search, booking, payment modal ---
  if(path === "find.html"){
    // DOM refs
    const searchInput = document.getElementById("searchInput");
    const suggestBox = document.getElementById("suggestBox");
    const searchBtn = document.getElementById("searchBtn");
    const resultsGrid = document.getElementById("resultsGrid");
    const resultsMessage = document.getElementById("resultsMessage");
    const relatedBox = document.getElementById("relatedBox");
    const modalPaymentEl = document.getElementById("modalPayment");
    const modalPayment = new bootstrap.Modal(modalPaymentEl);
    const paymentForm = document.getElementById("paymentForm");
    const payNowBtn = document.getElementById("payNowBtn");
    const paymentAlert = document.getElementById("paymentAlert");
    const payCardRadio = document.getElementById("payCard");
    const payGpayRadio = document.getElementById("payGpay");
    const cardFields = document.getElementById("cardFields");
    const gpayInfo = document.getElementById("gpayInfo");
    const cardName = document.getElementById("cardName");
    const cardNumber = document.getElementById("cardNumber");
    const cardExp = document.getElementById("cardExp");
    const cardCvv = document.getElementById("cardCvv");
    const gpayNumber = document.getElementById("gpayNumber");

    const modalTicketEl = document.getElementById("modalTicket");
    const modalTicket = new bootstrap.Modal(modalTicketEl);
    const ticketBody = document.getElementById("ticketBody");
    const btnDownloadTicket = document.getElementById("btnDownloadTicket");

    // suggestion helpers
    function computeSuggestions(q){
      if(!q) return [];
      const s = q.toLowerCase();
      const locs = parkingData.map(p => p.location);
      const names = parkingData.map(p => p.name);
      const pool = [...new Set([...locs, ...names])];
      return pool.filter(x => x.toLowerCase().includes(s)).slice(0,8);
    }
    function showSuggestions(items){
      suggestBox.innerHTML = "";
      if(!items.length){ suggestBox.classList.add("d-none"); return; }
      items.forEach(it => {
        const el = document.createElement("button");
        el.type = "button"; el.className = "list-group-item list-group-item-action";
        el.textContent = it;
        el.addEventListener("click", ()=> {
          searchInput.value = it; suggestBox.classList.add("d-none"); searchBtn.click();
        });
        suggestBox.appendChild(el);
      });
      suggestBox.classList.remove("d-none");
    }

    // search / match
    function findMatches(query){
      if(!query) return [];
      const q = query.toLowerCase();
      return parkingData.filter(p => {
        return p.location.toLowerCase().includes(q) ||
               p.name.toLowerCase().includes(q) ||
               p.location.split(' ').some(t => t.toLowerCase().startsWith(q)) ||
               p.name.split(' ').some(t => t.toLowerCase().startsWith(q));
      });
    }

    function renderResults(matches, query){
      resultsGrid.innerHTML = ""; relatedBox.innerHTML = ""; suggestBox.classList.add("d-none");
      if(!matches.length){
        resultsMessage.innerHTML = <div class="alert alert-warning">No parking found for "<strong>${escapeHtml(query)}</strong>".</div>;
        const suggestions = [...new Set(parkingData.map(p => p.location))].slice(0,5);
        relatedBox.innerHTML = <small><strong>Try:</strong> ${suggestions.join(", ")}</small>;
        return;
      }
      resultsMessage.innerHTML = <div class="mb-2"><strong>${matches.length}</strong> parking options for "<strong>${escapeHtml(query)}</strong>"</div>;
      matches.forEach(p => {
        const col = document.createElement("div");
        col.className = "col-md-4";
        col.innerHTML = `
          <div class="card parking">
            <img src="${p.img}" class="card-img-top" alt="${escapeHtml(p.name)}">
            <div class="card-body">
              <h5 class="card-title">${escapeHtml(p.name)}</h5>
              <p class="card-text text-muted">${escapeHtml(p.location)}</p>
              <div class="d-flex justify-content-between align-items-center mt-3">
                <div>${p.type === "paid" ? <span class="badge-paid">Paid</span> <small class="text-muted">₹${p.price}</small> : <span class="badge-free">Free</span>}</div>
                <div>
                  <button class="btn btn-sm btn-outline-primary me-1" data-action="view" data-id="${p.id}">View</button>
                  <button class="btn btn-sm btn-primary" data-action="book" data-id="${p.id}">${p.type === "paid" ? "Pay & Book" : "Reserve"}</button>
                </div>
              </div>
            </div>
          </div>
        `;
        resultsGrid.appendChild(col);
      });
      const related = parkingData.filter(p => !matches.includes(p)).slice(0,4).map(p => p.location);
      if(related.length) relatedBox.innerHTML = <small><strong>Related:</strong> ${[...new Set(related)].join(", ")}</small>;
    }

    // events: autosuggest input
    let suggestionIndex = -1;
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      suggestionIndex = -1;
      const suggestions = computeSuggestions(q);
      showSuggestions(suggestions);
    });

    searchInput.addEventListener("keydown", (e) => {
      const items = [...suggestBox.querySelectorAll(".list-group-item")];
      if(suggestBox.classList.contains("d-none") || items.length === 0) return;
      if(e.key === "ArrowDown"){ e.preventDefault(); suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1); items.forEach((it, i) => it.classList.toggle("active", i === suggestionIndex)); items[suggestionIndex].scrollIntoView({block:"nearest"}); }
      else if(e.key === "ArrowUp"){ e.preventDefault(); suggestionIndex = Math.max(suggestionIndex - 1, 0); items.forEach((it, i) => it.classList.toggle("active", i === suggestionIndex)); items[suggestionIndex].scrollIntoView({block:"nearest"}); }
      else if(e.key === "Enter"){ e.preventDefault(); if(suggestionIndex >= 0 && items[suggestionIndex]) items[suggestionIndex].click(); else searchBtn.click(); }
      else if(e.key === "Escape"){ suggestBox.classList.add("d-none"); }
    });

    document.addEventListener("click", (ev) => {
      if(!document.querySelector("main").contains(ev.target)) suggestBox.classList.add("d-none");
    });

    // search button
    searchBtn.addEventListener("click", () => {
      const q = searchInput.value.trim();
      const matches = findMatches(q);
      renderResults(matches, q);
    });

    // allow enter
    searchInput.addEventListener("keydown", (e) => { if(e.key === "Enter") searchBtn.click(); });

    // delegation: view/book buttons inside resultsGrid
    let currentBooking = null;
    resultsGrid.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if(!btn) return;
      const action = btn.dataset.action;
      const pid = btn.dataset.id;
      if(!action || !pid) return;
      const p = parkingData.find(x => x.id === pid);
      const cur = storage.getCurrent();
      if(!cur){ window.location.href = "login.html"; return; }

      if(action === "view"){
        // show details in ticket modal for simplicity
        const modalTicketEl = document.getElementById("modalTicket");
        const modalTicket = new bootstrap.Modal(modalTicketEl);
        const ticketBody = document.getElementById("ticketBody");
        ticketBody.innerHTML = `<div><h5>${escapeHtml(p.name)}</h5><img src="${p.img}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;margin:8px 0"><p class="text-muted">${escapeHtml(p.location)}</p><p>${p.type === "paid" ? <strong>Paid:</strong> ₹${p.price} : <strong>Free parking</strong>}</p></div>`;
        modalTicket.show();
      } else if(action === "book"){
        // if paid open payment modal
        currentBooking = { parking: p, user: cur };
        if(p.type === "paid"){
          payNowBtn.textContent = Pay ₹${p.price};
          payNowBtn.dataset.amount = p.price;
          paymentForm.reset();
          paymentAlert.classList.add("d-none");
          cardFields.classList.remove("d-none");
          gpayInfo.classList.add("d-none");
          modalPayment.show();
        } else {
          if(!confirm(Reserve ${p.name} at ${p.location}?)) return;
          const ticket = {
            id: generateBookingId(),
            userEmail: cur.email,
            userName: cur.name,
            parkingId: p.id,
            parkingName: p.name,
            location: p.location,
            type: "free",
            price: 0,
            time: Date.now()
          };
          saveBooking(ticket);
          // show ticket modal
          const ticketBody = document.getElementById("ticketBody");
          ticketBody.innerHTML = <div><h6>Ticket ID: <strong>${ticket.id}</strong></h6><p><strong>${escapeHtml(ticket.parkingName)}</strong> — ${escapeHtml(ticket.location)}</p><p>Type: Reserved (Free)</p><p>Booked by: ${escapeHtml(ticket.userName)}</p><p>Time: ${new Date(ticket.time).toLocaleString()}</p></div>;
          const modalTicket = new bootstrap.Modal(document.getElementById("modalTicket"));
          modalTicket.show();
          // refresh account page data if user navigates
        }
      }
    });

    // payment UI toggle
    function updatePaymentUI(){
      if(payGpayRadio.checked){ cardFields.classList.add("d-none"); gpayInfo.classList.remove("d-none"); } else { cardFields.classList.remove("d-none"); gpayInfo.classList.add("d-none"); }
    }
    payCardRadio.addEventListener("change", updatePaymentUI);
    payGpayRadio.addEventListener("change", updatePaymentUI);

    // simple card formatting
    cardNumber.addEventListener("input", (e)=>{ let v=e.target.value.replace(/\D/g,'').slice(0,16); v=v.replace(/(.{4})/g,'$1 ').trim(); e.target.value=v; });
    cardExp.addEventListener("input", (e)=>{ let v=e.target.value.replace(/\D/g,'').slice(0,4); if(v.length>2) v=v.slice(0,2)+'/'+v.slice(2); e.target.value=v; });

    // payment submit (simulated)
    paymentForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      paymentAlert.classList.add("d-none");
      if(!currentBooking){ paymentAlert.textContent = "No booking in progress."; paymentAlert.classList.remove("d-none"); return; }
      const p = currentBooking.parking;
      const cur = storage.getCurrent();
      if(!cur){ paymentAlert.textContent = "Login required."; paymentAlert.classList.remove("d-none"); return; }
      const amount = parseInt(payNowBtn.dataset.amount || "0", 10);

      if(payGpayRadio.checked){
        const num = document.getElementById("gpayNumber").value.trim();
        if(!/^\+?\d{10,13}$/.test(num)){ paymentAlert.textContent = "Enter valid GPay number (simulated)."; paymentAlert.classList.remove("d-none"); return; }
        payNowBtn.disabled = true; payNowBtn.textContent = "Processing...";
        setTimeout(()=> {
          payNowBtn.disabled = false; payNowBtn.textContent = Pay ₹${amount}; modalPayment.hide();
          const ticket = { id: generateBookingId(), userEmail: cur.email, userName: cur.name, parkingId: p.id, parkingName: p.name, location: p.location, type: "paid", price: amount, time: Date.now() };
          saveBooking(ticket);
          const ticketBody = document.getElementById("ticketBody");
          ticketBody.innerHTML = <div><h6>Ticket ID: <strong>${ticket.id}</strong></h6><p><strong>${escapeHtml(ticket.parkingName)}</strong> — ${escapeHtml(ticket.location)}</p><p>Type: Paid (₹${ticket.price})</p><p>Booked by: ${escapeHtml(ticket.userName)}</p><p>Time: ${new Date(ticket.time).toLocaleString()}</p></div>;
          const modalTicket = new bootstrap.Modal(document.getElementById("modalTicket")); modalTicket.show();
        }, 1100);
        return;
      }

      // card validation (basic simulated)
      const name = cardName.value.trim(); const num = cardNumber.value.replace(/\s/g,''); const exp=cardExp.value.trim(); const cvv=cardCvv.value.trim();
      if(!name || num.length < 13 || !/^\d{3,4}$/.test(cvv) || !/^\d{2}\/\d{2}$/.test(exp)){ paymentAlert.textContent = "Enter valid card details (demo)."; paymentAlert.classList.remove("d-none"); return; }
      payNowBtn.disabled = true; payNowBtn.textContent = "Processing...";
      setTimeout(()=> {
        payNowBtn.disabled = false; payNowBtn.textContent = Pay ₹${amount}; modalPayment.hide();
        const ticket = { id: generateBookingId(), userEmail: cur.email, userName: cur.name, parkingId: p.id, parkingName: p.name, location: p.location, type: "paid", price: amount, time: Date.now() };
        saveBooking(ticket);
        const ticketBody = document.getElementById("ticketBody");
        ticketBody.innerHTML = <div><h6>Ticket ID: <strong>${ticket.id}</strong></h6><p><strong>${escapeHtml(ticket.parkingName)}</strong> — ${escapeHtml(ticket.location)}</p><p>Type: Paid (₹${ticket.price})</p><p>Booked by: ${escapeHtml(ticket.userName)}</p><p>Time: ${new Date(ticket.time).toLocaleString()}</p></div>;
        const modalTicket = new bootstrap.Modal(document.getElementById("modalTicket")); modalTicket.show();
      }, 1100);
    });

    // ticket download from modal
    btnDownloadTicket.addEventListener("click", () => {
      const body = document.getElementById("ticketBody").textContent || "";
      const blob = new Blob([body], {type:"text/plain"});
      const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="ticket.txt"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  } // end find.html wiring

  // --- account page wiring ---
  if(path === "account.html"){
    const bookingHistory = document.getElementById("bookingHistory");
    function renderBookingHistory(){
      bookingHistory.innerHTML = "";
      const cur = storage.getCurrent();
      if(!cur){
        bookingHistory.innerHTML = <div class="alert alert-info">Login to view your bookings. <a href="login.html">Login</a></div>;
        return;
      }
      const bookings = cur.bookings || [];
      if(!bookings.length){ bookingHistory.innerHTML = <div class="alert alert-warning">No bookings yet.</div>; return; }
      bookings.forEach(b => {
        const div = document.createElement("div");
        div.className = "booking-item";
        div.innerHTML = `<div class="d-flex justify-content-between align-items-start"><div><h6 class="mb-1">${escapeHtml(b.parkingName)} <small class="text-muted">(${escapeHtml(b.location)})</small></h6><div class="text-muted small">Ticket: ${b.id} • ${new Date(b.time).toLocaleString()}</div><div class="mt-2"><strong>${b.type === "paid" ? Paid ₹${b.price} : "Reserved (Free)"}</strong></div></div><div><button class="btn btn-sm btn-outline-primary" data-id="${b.id}" data-action="viewTicket">View Ticket</button></div></div>`;
        bookingHistory.appendChild(div);
      });
      // view ticket button
      bookingHistory.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button");
        if(!btn) return;
        const id = btn.dataset.id;
        const all = storage.getBookings();
        const ticket = all.find(x => x.id === id);
        if(ticket){
          const ticketBody = document.getElementById("ticketBody");
          ticketBody.innerHTML = `<div><h6>Ticket ID: <strong>${ticket.id}</strong></h6><p><strong>${escapeHtml(ticket.parkingName)}</strong> — ${escapeHtml(ticket.location)}</p><p>Type: ${ticket.type === "paid" ? Paid (₹${ticket.price}) : "Free / Reserved"}</p><p>Booked by: ${escapeHtml(ticket.userName)} (${escapeHtml(ticket.userEmail)})</p><p>Time: ${new Date(ticket.time).toLocaleString()}</p></div>`;
          const modalTicket = new bootstrap.Modal(document.getElementById("modalTicket")); modalTicket.show();
        }
      });
    }
    // initial render
    renderBookingHistory();
    // wire ticket download (modal ticket controls exist in DOM only if this page loaded ticket modal markup — to be safe, attach if exists)
    const btnDownloadTicket = document.getElementById("btnDownloadTicket");
    if(btnDownloadTicket){
      btnDownloadTicket.addEventListener("click", () => {
        const ticketBody = document.getElementById("ticketBody");
        const bodyText = ticketBody ? ticketBody.textContent : "Ticket";
        const blob = new Blob([bodyText], {type:"text/plain"}); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="ticket.txt"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      });
    }
  } // end account.html wiring

  // --- initial demo user if no users exist (helps testing) ---
  if(storage.getUsers().length === 0){
    storage.setUsers([{ name:"Demo User", email:"demo@example.com", password:"demo123", bookings:[] }]);
  }

}); // DOMContentLoaded