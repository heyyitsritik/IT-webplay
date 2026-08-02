
let auths = JSON.parse(window.localStorage.getItem('auths')) || [];


let authList = document.getElementById('auths-container');

displayAuths();

function displayAuths() {
  let authList = document.getElementById("auths-list");
  authList.innerHTML = '';

  let table = document.createElement("table");
  table.classList.add("table", "table-bordered");

  let headers = table.createTHead().insertRow();
  headers.insertCell().textContent = "index";
  headers.insertCell().textContent = "name";
  headers.insertCell().textContent = "server";
  headers.insertCell().textContent = "Web";

  auths.forEach((auth, index) => {
    let row = table.insertRow();
    row.insertCell().textContent = index;
    row.insertCell().textContent = auth.displayName;
    row.insertCell().textContent = auth.server;

    let pageCell = row.insertCell();
    let deleteButton = document.createElement("button");
    deleteButton.classList.add("btn", "btn-danger");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      auths.splice(index, 1);
      window.localStorage.setItem('auths', JSON.stringify(auths));
      displayAuths();
    });
    pageCell.appendChild(deleteButton);

    let webVersion = document.createElement("button");
    webVersion.classList.add("btn", "btn-info", "mx-2"); 
    webVersion.textContent = "webVersion";
    webVersion.addEventListener("click", () => {
      const username = auth.username;
      const password = auth.password;
      const zone = auth.zone;
      
      webBrowser(username, password, zone);
    });
    pageCell.appendChild(webVersion);
    let editUser = document.createElement("button");
    editUser.classList.add("btn", "btn-primary", "mx-2");
    editUser.textContent = "Edit";
    editUser.addEventListener("click", () => {
      window.open(`edit.html?userIndex=${index}`, '_blank');
    });
    pageCell.appendChild(editUser);

    let cloneButton = document.createElement("button");
    cloneButton.classList.add("btn", "btn-secondary", "mx-2");
    cloneButton.textContent = "Clone";
    cloneButton.addEventListener("click", () => {
      let clonedAuth = { ...auth };
      clonedAuth.id = Date.now();
      auths.splice(index + 1, 0, clonedAuth);
      window.localStorage.setItem('auths', JSON.stringify(auths));
      displayAuths();
    });
    pageCell.appendChild(cloneButton);
  });

  authList.appendChild(table);
  let searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    let filter = searchInput.value.toUpperCase();
    let rows = table.getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
      let cells = rows[i].getElementsByTagName("td");
      let visible = false;
      for (let j = 0; j < cells.length; j++) {
        let cell = cells[j];
        if (cell.textContent.toUpperCase().indexOf(filter) > -1) {
          visible = true;
          break;
        }
      }
      rows[i].style.display = visible ? "" : "none";
    }
  });
}

displayAuths();
