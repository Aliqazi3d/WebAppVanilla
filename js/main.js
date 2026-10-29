const $ = (sel) => document.querySelector(sel);
const page = document.body.dataset.page;

// Small pop-up message
function toast(msg) {
  const el = Object.assign(document.createElement("div"), { className: "toast", textContent: msg });
  el.setAttribute("role", "status");
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

// Load animals once (the service worker caches this for offline)
let animals = [];
async function loadAnimals() {
  try {
    animals = await (await fetch("data/animals.json")).json();
  } catch {
    toast("Could not load animals");
  }
}

// Favourites live in localStorage as a list of ids
const getFavs = () => JSON.parse(localStorage.getItem("fav_animals") || "[]");
function toggleFav(id) {
  const favs = getFavs();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem("fav_animals", JSON.stringify(next));
  toast(next.includes(id) ? "Added to favourites" : "Removed from favourites");
}

const cardHTML = (a) => `
  <article class="card">
    <div class="emoji" aria-hidden="true">${a.emoji}</div>
    <h2>${a.name}</h2>
    <span class="badge">${a.status}</span>
    <p>${a.habitat}</p>
    <a class="btn" href="animal-detail.html?id=${a.id}">View ${a.name}</a>
  </article>`;

const views = {
  // Animals list with live search
  animals() {
    const draw = (q) => {
      const hits = animals.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
      $("#list").innerHTML = hits.map(cardHTML).join("") || "<p>No animals match your search.</p>";
    };
    draw("");
    $("#search").addEventListener("input", (e) => draw(e.target.value));
  },

  // Detail page: pick the animal from ?id=
  detail() {
    const a = animals.find((x) => x.id === new URLSearchParams(location.search).get("id"));
    if (!a) return ($("#detail").innerHTML = '<p>Animal not found. <a href="animals.html">Back to animals</a></p>');
    document.title = `${a.name} – Alder Brook`;
    const label = () => (getFavs().includes(a.id) ? "❤️ Remove from favourites" : "🤍 Add to favourites");
    $("#detail").innerHTML = `
      <div class="card">
        <div class="emoji" aria-hidden="true">${a.emoji}</div>
        <h1>${a.name}</h1>
        <p><em>${a.species}</em> <span class="badge">${a.status}</span></p>
        <p><strong>Habitat:</strong> ${a.habitat}</p>
        <p>${a.description}</p>
        <button class="btn" id="fav">${label()}</button>
      </div>`;
    $("#fav").onclick = (e) => { toggleFav(a.id); e.target.textContent = label(); };
  },

  favourites() {
    const mine = animals.filter((a) => getFavs().includes(a.id));
    $("#list").innerHTML = mine.map(cardHTML).join("") || "<p>No favourites yet. Open an animal and tap the heart.</p>";
  },

  // Leaflet map plus the Geolocation API
  map() {
    if (typeof L === "undefined") return ($("#map").textContent = "The map needs a connection the first time you open it.");
    const map = L.map("map").setView([53.7632, -2.7031], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
    animals.forEach((a) =>
      L.marker([a.lat, a.lng]).addTo(map).bindPopup(`<b>${a.emoji} ${a.name}</b><br><a href="animal-detail.html?id=${a.id}">Details</a>`));

    $("#locate").onclick = () => {
      if (!navigator.geolocation) return toast("Location is not supported");
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const here = [coords.latitude, coords.longitude];
          L.circleMarker(here, { radius: 9 }).addTo(map).bindPopup("You are here").openPopup();
          map.setView(here, 15);
        },
        () => toast("Location permission denied"));
    };
  },
};

// Network status API
addEventListener("online", () => toast("You are back online"));
addEventListener("offline", () => toast("You are offline, saved pages still work"));

// Install prompt: hold the event until the user taps our button
let installEvent;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  if ($("#install-btn")) $("#install-btn").hidden = false;
});
$("#install-btn")?.addEventListener("click", async () => {
  installEvent.prompt();
  await installEvent.userChoice;
  $("#install-btn").hidden = true;
});

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js"));

loadAnimals().then(() => views[page]?.());
