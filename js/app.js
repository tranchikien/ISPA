const $ = (sel, root = document) => root.querySelector(sel);

const App = {
  page: "dashboard", customerId: null, customerTab: "cards", serviceTab: "svc", khServiceTab: "services", khBookPreset: "",
  chartRange: 7, searchQ: "", toastTimer: null,
  bookingFilters: { q: "", status: "", tech: "", from: "", to: "" },
  bookingSort: { key: "at", dir: "desc" }, bookingPage: 1,
  customerSort: { key: "name", dir: "asc" }, customerPage: 1,
  reportFilters: { from: "", to: "", branch: "", staff: "" }, pageSize: 10,

  init() { this.render(); },
  currentUser() { return Store.currentUser(); },
  isAdmin() { const u = this.currentUser(); return !!u?.admin; },
  isTechnician() { const u = this.currentUser(); return u?.role === "Kỹ thuật viên tự do"; },
  isCustomer() { const u = this.currentUser(); return u?.type === "customer" || u?.role === "Khách hàng"; },
  canManageStaff() { return this.isAdmin(); },
  canDelete() { return this.isAdmin(); },
  go(page, extra = {}) { this.page = page; Object.assign(this, extra); this.render(); },

  esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  toast(msg) {
    const root = $("#toast-root");
    root.innerHTML = `<div class="toast-wrap"><div class="toast">${msg}</div></div>`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (root.innerHTML = ""), 2800);
  },
  closeModal() { $("#modal-root").innerHTML = ""; },
  openModal(html) {
    $("#modal-root").innerHTML = `<div class="modal-backdrop"><div class="modal">${html}</div></div>`;
    $(".modal-backdrop").addEventListener("click", (e) => { if (e.target.classList.contains("modal-backdrop")) this.closeModal(); });
  },
  nowLocal() { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); },
  todayISO() { return new Date().toISOString().slice(0, 10); },
  readImage(file, done) {
    if (!file) return done("");
    const reader = new FileReader();
    reader.onload = () => done(reader.result);
    reader.readAsDataURL(file);
  },
  avatar(src, name, cls = "") {
    const ch = (name || "?").trim().charAt(0).toUpperCase();
    return src ? `<img class="avatar ${cls}" src="${src}" alt="">` : `<div class="avatar-ph ${cls}">${ch}</div>`;
  },
  statusBadge(status) {
    const map = { "Chờ xác nhận": "st-pending", "Đã xác nhận": "st-confirmed", "Đang làm": "st-progress", "Hoàn tất": "st-done", "Đã hủy": "st-cancelled" };
    return `<span class="status-badge ${map[status] || ""}">${status}</span>`;
  },
  serviceOptions(selected = "") { return Store.get().services.map((s) => `<option value="${s.id}" ${s.id === selected ? "selected" : ""}>${this.esc(s.name)} · ${Store.money(Store.serviceUnit(s))}</option>`).join(""); },
  techOptions(selected = "") {
    const list = Store.technicians(); const all = list.length ? list : Store.get().staff;
    return `<option value="">— Không chọn —</option>` + all.map((t) => `<option value="${this.esc(t.name)}" ${t.name === selected ? "selected" : ""}>${this.esc(t.name)}</option>`).join("");
  },
  branchOptions(selected = "") { return Store.get().branches.map((b) => `<option ${b === selected ? "selected" : ""}>${this.esc(b)}</option>`).join(""); },
  navActive(id) { if (id === "customers" && this.page === "customer") return true; return this.page === id; },

  // LOGIN
  renderLogin() {
    $("#app").innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="brand" style="justify-content:center;border:0">
            <div class="brand-mark">i</div>
            <div><h1 style="margin:0">iSpa Pro</h1><p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.7">Professional Spa OS</p></div>
          </div>
          <h2>Đăng nhập</h2>
          <form id="login-form" class="form-grid" style="grid-template-columns:1fr">
            <div><label>Số điện thoại / Email</label><input name="username" required autofocus autocomplete="username" placeholder="admin hoặc 0901234567"></div>
            <div><label>Mật khẩu</label><input name="password" type="password" required autocomplete="current-password"></div>
            <button class="btn btn-gold" type="submit">Đăng nhập</button>
          </form>
          <div class="login-hint">
            <strong>Demo accounts (mật khẩu: 123456)</strong>
            <div>👔 <b>Admin:</b> admin — Phạm Quốc Huy</div>
            <div>🧑‍🔧 <b>KTV:</b> anh.tran@ispa.vn — Trần Minh Anh</div>
            <div>👤 <b>Khách hàng:</b> 0901234567 — Nguyễn Thị Lan</div>
          </div>
        </div>
      </div>
    `;
    $("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const user = Store.login(f.username.value.trim(), f.password.value);
      if (!user) { this.toast("Sai tên đăng nhập hoặc mật khẩu"); return; }
      this.page = user.type === "customer" ? "kh-home" : "dashboard";
      this.render();
    });
  },

  // SHELL
  shell(content, title, sub) {
    const user = this.currentUser() || {};
    const isCustomer = this.isCustomer();
    const staffItems = [
      ["dashboard", "⌂", "Tổng quan"], ["categories", "☰", "Quản lý danh mục"], ["services", "◈", "Quản lý dịch vụ"],
      ["bookings", "◷", "Quản lý đặt lịch"], ["customers", "☺", "Quản lý khách hàng"], ["reports", "📊", "Báo cáo doanh thu"],
      ...(this.canManageStaff() ? [["staff", "✦", "Quản lý nhân viên"]] : []), ["hotdeals", "★", "Quản lý HotDeal"],
    ];
    const customerItems = [
      ["kh-home", "🏠", "Trang chủ"], ["kh-services", "◈", "Dịch vụ"], ["kh-book", "◷", "Đặt lịch"],
      ["kh-cards", "💳", "Thẻ của tôi"], ["kh-orders", "📋", "Đơn của tôi"], ["kh-profile", "👤", "Tài khoản"],
    ];
    const items = isCustomer ? customerItems : staffItems;
    return `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">i</div>
            <div><h1>iSpa Pro</h1><p>${isCustomer ? "Customer App" : "Professional Spa OS"}</p></div>
          </div>
          <nav class="nav">
            ${items.map(([id, icon, label]) => `<button class="${this.navActive(id) ? "active" : ""}" data-go="${id}"><span class="icon">${icon}</span>${label}</button>`).join("")}
          </nav>
          <div class="sidebar-user">
            <div class="person">${this.avatar(user.avatar, user.name)}
              <div><strong>${this.esc(user.name)}</strong><div class="muted-light">${this.esc(user.role)}${user.admin ? " · Admin" : ""}</div></div>
            </div>
            <button class="btn btn-ghost btn-logout" id="logout-btn">Đăng xuất</button>
          </div>
        </aside>
        <section class="main">
          <div class="topbar">
            <div><h2>${title}</h2><p class="sub">${sub}</p></div>
            ${isCustomer ? "" : `<button class="btn btn-ghost" id="reset-demo">Khôi phục dữ liệu mẫu</button>`}
          </div>
          <div class="page">${content}</div>
        </section>
      </div>
      <div class="print-sheet" id="print-sheet"></div>
    `;
  },

  render() {
    if (!this.currentUser()) { this.renderLogin(); return; }
    if (this.isCustomer() && !this.page.startsWith("kh-")) this.page = "kh-home";
    if (!this.isCustomer() && this.page.startsWith("kh-")) this.page = "dashboard";
    if (!this.canManageStaff() && this.page === "staff") this.page = "dashboard";

    const views = {
      dashboard: () => this.viewDashboard(), categories: () => this.viewCategories(), services: () => this.viewServices(),
      bookings: () => this.viewBookings(), customers: () => this.viewCustomers(), customer: () => this.viewCustomer(),
      staff: () => this.viewStaff(), hotdeals: () => this.viewHotDeals(), reports: () => this.viewReports(),
      "kh-home": () => this.viewKHHome(), "kh-services": () => this.viewKHServices(), "kh-book": () => this.viewKHBook(),
      "kh-cards": () => this.viewKHCards(), "kh-orders": () => this.viewKHOrders(), "kh-profile": () => this.viewKHProfile(),
    };
    $("#app").innerHTML = (views[this.page] || views.dashboard)();
    this.bind();
  },

  bind() {
    document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
      const target = b.dataset.go;
      if (target === "kh-book") this.khBookPreset = "";
      this.go(target);
    }));
    $("#logout-btn")?.addEventListener("click", () => { Store.logout(); this.page = "dashboard"; this.render(); });
    $("#reset-demo")?.addEventListener("click", () => {
      if (!confirm("Khôi phục dữ liệu mẫu? Mọi thay đổi sẽ mất.")) return;
      Store.reset(); this.toast("Đã khôi phục dữ liệu mẫu"); this.render();
    });
    const map = {
      dashboard: () => this.bindDashboard(), categories: () => this.bindCategories(), services: () => this.bindServices(),
      bookings: () => this.bindBookings(), customers: () => this.bindCustomers(), customer: () => this.bindCustomer(),
      staff: () => this.bindStaff(), hotdeals: () => this.bindHotDeals(), reports: () => this.bindReports(),
      "kh-home": () => this.bindKHHome(), "kh-services": () => this.bindKHServices(), "kh-book": () => this.bindKHBook(),
      "kh-cards": () => this.bindKHCards(), "kh-orders": () => this.bindKHOrders(), "kh-profile": () => this.bindKHProfile(),
    };
    map[this.page]?.();
  },

  // HELPERS
  sortRows(rows, sort) {
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "totalBalance") { av = (a.cards || []).reduce((s, x) => s + x.balance, 0); bv = (b.cards || []).reduce((s, x) => s + x.balance, 0); }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1; if (av > bv) return dir === "asc" ? 1 : -1; return 0;
    });
  },
  paginate(rows, page, size) {
    const total = Math.ceil(rows.length / size) || 1;
    const p = Math.min(Math.max(1, page), total);
    return { rows: rows.slice((p - 1) * size, p * size), page: p, total, totalRows: rows.length };
  },
  sortTh(label, key, state, page) {
    const active = state.key === key;
    const arrow = active ? (state.dir === "asc" ? " ▲" : " ▼") : "";
    return `<th class="sortable" data-sort-key="${key}" data-sort-page="${page}">${label}${arrow}</th>`;
  },
  pager(page, total, pageNum, totalRows) {
    if (total <= 1) return "";
    const btns = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - page) <= 1) {
        btns.push(`<button class="page-btn ${i === page ? "active" : ""}" data-page-num="${i}" data-page-for="${pageNum}">${i}</button>`);
      } else if (Math.abs(i - page) === 2) { btns.push(`<span class="page-ellipsis">…</span>`); }
    }
    return `<div class="pagination"><span class="muted">${totalRows} mục</span>${btns.join("")}</div>`;
  },
  bindSortAndPager(pageNum) {
    document.querySelectorAll(`[data-sort-page="${pageNum}"]`).forEach((th) => {
      th.onclick = () => {
        const key = th.dataset.sortKey;
        const state = pageNum === "bookings" ? this.bookingSort : this.customerSort;
        if (state.key === key) state.dir = state.dir === "asc" ? "desc" : "asc";
        else { state.key = key; state.dir = "asc"; }
        this.render();
      };
    });
    document.querySelectorAll(`[data-page-for="${pageNum}"]`).forEach((b) => {
      b.onclick = () => {
        if (pageNum === "bookings") this.bookingPage = Number(b.dataset.pageNum);
        else this.customerPage = Number(b.dataset.pageNum);
        this.render();
      };
    });
  },

  // DASHBOARD
  buildRevenueChart(days) {
    const list = Store.get().bookings.filter((b) => b.status === "Hoàn tất" && b.at);
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ key, label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 });
    }
    const map = Object.fromEntries(buckets.map((b) => [b.key, b]));
    list.forEach((b) => {
      const key = (b.at || "").slice(0, 10);
      if (map[key]) map[key].value += Number(b.revenueRecognized ?? b.total ?? 0);
    });
    const max = Math.max(1, ...buckets.map((b) => b.value));
    const W = 720, H = 220, PAD = 30;
    const bw = (W - PAD * 2) / buckets.length;
    const step = Math.ceil(days / 7);
    const bars = buckets.map((b, i) => {
      const h = (b.value / max) * (H - PAD * 2);
      return `<rect x="${PAD + i * bw + 4}" y="${H - PAD - h}" width="${bw - 8}" height="${h}" fill="url(#barGrad)" rx="4" />`;
    }).join("");
    const labels = buckets.map((b, i) => {
      if (i % step !== 0 && i !== buckets.length - 1) return "";
      return `<text x="${PAD + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#5c5048">${b.label}</text>`;
    }).join("");
    const values = buckets.map((b, i) => {
      if (b.value === 0) return "";
      const x = PAD + i * bw + bw / 2;
      const y = H - PAD - (b.value / max) * (H - PAD * 2) - 6;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="#241c18" font-weight="600">${(b.value / 1000).toFixed(0)}k</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none">
      <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c4a574"/><stop offset="100%" stop-color="#9a7848"/></linearGradient></defs>
      ${bars}${labels}${values}</svg>`;
  },
  getTopServices(limit = 5) {
    const counts = {};
    Store.get().bookings.filter((b) => b.status === "Hoàn tất").forEach((b) => {
      if (b.lines?.length) {
        b.lines.forEach((l) => {
          if (!counts[l.name]) counts[l.name] = { name: l.name, qty: 0, revenue: 0 };
          counts[l.name].qty += l.qty || 1; counts[l.name].revenue += l.amount || 0;
        });
      } else if (b.item) {
        const k = b.item.replace(/ x\d+$/, "");
        if (!counts[k]) counts[k] = { name: k, qty: 0, revenue: 0 };
        counts[k].qty += 1; counts[k].revenue += Number(b.total || 0);
      }
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  },
  getTopTechnicians(limit = 5) {
    const counts = {};
    Store.get().bookings.filter((b) => b.technician && b.status === "Hoàn tất").forEach((b) => {
      if (!counts[b.technician]) counts[b.technician] = { name: b.technician, count: 0, revenue: 0 };
      counts[b.technician].count += 1; counts[b.technician].revenue += Number(b.revenueRecognized ?? b.total ?? 0);
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  },

  viewDashboard() {
    const d = Store.get();
    const revenue = d.bookings.filter((b) => b.status === "Hoàn tất").reduce((s, b) => s + Number(b.revenueRecognized ?? b.total ?? 0), 0);
    const chartRange = this.chartRange;
    const chart = this.buildRevenueChart(chartRange);
    const topServices = this.getTopServices(5);
    const topTechs = this.getTopTechnicians(5);
    const expiring = Store.getExpiringCards(30);
    const birthdays = Store.getBirthdaysThisMonth();
    const warnings = [];
    expiring.forEach(({ customer, card, status, daysLeft }) => {
      const label = status === "expired" ? `<span class="status-badge st-cancelled">Hết hạn</span>` : `<span class="status-badge st-pending">Còn ${daysLeft} ngày</span>`;
      warnings.push(`<div class="warn-row"><div><strong>${this.esc(customer.name)}</strong> — ${this.esc(card.name)} <span class="muted">(${customer.phone})</span></div><div>${label} ${card.expiryDate ? `<span class="muted">· HH ${card.expiryDate}</span>` : ""}</div></div>`);
    });
    birthdays.forEach((c) => {
      const day = c.birthday.split("-").slice(1).join("/");
      warnings.push(`<div class="warn-row"><div><strong>${this.esc(c.name)}</strong> — Sinh nhật ${day} <span class="muted">(${c.phone})</span></div><div><span class="status-badge st-progress">🎂 Sinh nhật tháng này</span></div></div>`);
    });
    const svcHtml = topServices.length ? topServices.map((s, i) => `<div class="top-row"><span class="top-rank">${i + 1}</span><div class="top-main"><strong>${this.esc(s.name)}</strong><div class="muted">${s.qty} suất</div></div><div class="top-value">${Store.money(s.revenue)}</div></div>`).join("") : `<p class="muted">Chưa có dữ liệu</p>`;
    const techHtml = topTechs.length ? topTechs.map((t, i) => `<div class="top-row"><span class="top-rank">${i + 1}</span><div class="top-main"><strong>${this.esc(t.name)}</strong><div class="muted">${t.count} đơn</div></div><div class="top-value">${Store.money(t.revenue)}</div></div>`).join("") : `<p class="muted">Chưa có dữ liệu</p>`;
    const deals = d.hotdeals.map((h) => {
      const sv = Store.getService(h.serviceId);
      return `<div class="hotdeal-banner">${h.image ? `<img src="${h.image}" alt="">` : `<div class="hotdeal-ph"></div>`}<div><strong>${this.esc(h.name)}</strong><div class="muted">${sv ? this.esc(sv.name) : ""} · ${h.quantity} suất · đến ${h.endDate}</div></div></div>`;
    }).join("");
    return this.shell(`
      <div class="hero">
        <div><h3>Chào mừng bạn đến với iSpa Pro</h3><p>Thêm đơn hàng, khách hàng, nhân viên, danh mục và dịch vụ. Bán thẻ giá trị, thanh toán bằng thẻ và đẩy HotDeal lên trang chủ ứng dụng.</p></div>
        <div class="btn-row" style="align-self:end">
          <button class="btn btn-gold" data-go="bookings">Thêm đơn hàng</button>
          <button class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.25)" data-go="customers">Thêm khách hàng</button>
        </div>
      </div>
      ${warnings.length ? `<div class="panel warnings-panel" style="padding:18px;margin-top:18px"><h4 style="margin:0 0 10px">⚠️ Cảnh báo (${warnings.length})</h4>${warnings.join("")}</div>` : ""}
      <div class="kpis">
        <div class="kpi"><span>Doanh thu hoàn tất</span><strong>${Store.money(revenue)}</strong></div>
        <div class="kpi"><span>Đơn / lịch hẹn</span><strong>${d.bookings.length}</strong></div>
        <div class="kpi"><span>Khách hàng</span><strong>${d.customers.length}</strong></div>
        <div class="kpi"><span>Nhân viên</span><strong>${d.staff.length}</strong></div>
      </div>
      <div class="panel" style="padding:18px">
        <div class="toolbar" style="margin-bottom:8px">
          <h4 style="margin:0">Doanh thu theo ngày</h4>
          <div class="btn-row">
            <button class="btn ${chartRange === 7 ? "btn-gold" : "btn-ghost"}" data-chart-range="7">7 ngày</button>
            <button class="btn ${chartRange === 30 ? "btn-gold" : "btn-ghost"}" data-chart-range="30">30 ngày</button>
          </div>
        </div>${chart}
      </div>
      <div class="split" style="margin-top:18px">
        <div class="panel" style="padding:18px"><h4 style="margin:0 0 12px">Top 5 dịch vụ</h4>${svcHtml}</div>
        <div class="panel" style="padding:18px"><h4 style="margin:0 0 12px">Top 5 KTV</h4>${techHtml}</div>
      </div>
      <div class="split" style="margin-top:18px">
        <div class="panel" style="padding:18px"><h4 style="margin:0 0 12px">HotDeal trên trang chủ</h4>${deals || `<p class="muted">Chưa có HotDeal.</p>`}</div>
        <div class="panel" style="padding:18px">
          <h4 style="margin:0 0 12px">Gợi ý thao tác</h4>
          <ol class="muted" style="line-height:1.7">
            <li>Quản lý danh mục → thêm danh mục → Quản lý dịch vụ → thêm dịch vụ</li>
            <li>Quản lý đặt lịch → Thêm mới → đơn hàng dịch vụ</li>
            <li>Báo cáo → chọn khoảng ngày, chi nhánh → Xuất CSV</li>
            <li>Nhấn vào trạng thái đơn để đổi trạng thái workflow</li>
          </ol>
        </div>
      </div>
    `, "Tổng quan", "Hệ thống quản lý spa chuyên nghiệp");
  },
  bindDashboard() { document.querySelectorAll("[data-chart-range]").forEach((btn) => { btn.onclick = () => { this.chartRange = Number(btn.dataset.chartRange); this.render(); }; }); },

  // CATEGORIES
  viewCategories() {
    const rows = Store.get().categories.map((c) => {
      const n = Store.get().services.filter((s) => s.category === c).length;
      const isSystem = c === "Thẻ giá trị";
      return `<tr><td>${this.esc(c)}${isSystem ? ` <span class="badge">Hệ thống</span>` : ""}</td><td>${n} dịch vụ</td><td><div class="btn-row">${isSystem ? "" : `<button class="icon-btn" data-cat-edit="${this.esc(c)}">✎ Sửa</button><button class="icon-btn" data-cat-del="${this.esc(c)}">🗑 Xóa</button>`}</div></td></tr>`;
    }).join("");
    return this.shell(`
      <div class="toolbar"><p class="muted" style="margin:0">Tạo danh mục trước khi thêm dịch vụ vào danh mục đó.</p><button class="btn btn-gold" id="add-cat">Thêm mới</button></div>
      <div class="panel" style="padding:8px 16px"><table><thead><tr><th>Tên danh mục</th><th>Số dịch vụ</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    `, "Quản lý danh mục", "Tạo mới, sửa hoặc xóa danh mục");
  },
  bindCategories() {
    $("#add-cat").onclick = () => this.formCategory();
    document.querySelectorAll("[data-cat-edit]").forEach((b) => { b.onclick = () => this.formCategory(b.dataset.catEdit); });
    document.querySelectorAll("[data-cat-del]").forEach((b) => {
      b.onclick = () => { if (!confirm(`Xóa danh mục "${b.dataset.catDel}"?`)) return; try { Store.deleteCategory(b.dataset.catDel); this.toast("Đã xóa danh mục"); this.render(); } catch (err) { this.toast(err.message); } };
    });
  },
  formCategory(oldName) {
    const editing = oldName || null;
    this.openModal(`<h3>${editing ? "Sửa danh mục" : "Thêm danh mục"}</h3><form id="cat-form" class="form-grid"><div class="full"><label>Tên danh mục</label><input name="name" required value="${this.esc(editing || "")}"></div><div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div></form>`);
    $("#cancel-modal").onclick = () => this.closeModal();
    $("#cat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        if (editing) { Store.updateCategory(editing, e.target.name.value); this.toast("Đã cập nhật danh mục"); }
        else { Store.addCategory(e.target.name.value); this.toast("Đã tạo danh mục"); }
        this.closeModal(); this.render();
      } catch (err) { this.toast(err.message); }
    });
  },

  // SERVICES
  viewServices() {
    const d = Store.get();
    const tab = this.serviceTab || "svc";
    const cards = d.valueCards.map((c) => {
      const isSession = c.cardType === "session";
      const sessions = Number(c.sessions || 0) + Number(c.bonusSessions || 0);
      return `<article class="card product-card"><div class="cover">${c.image ? `<img src="${c.image}" alt="">` : ""}</div><div class="body"><span class="badge">${this.esc(c.category)}</span>${isSession ? `<span class="badge badge-session">${sessions} buổi</span>` : ""}${c.online ? `<span class="badge">Đặt Online</span>` : ""}<h4>${this.esc(c.name)}</h4><div class="muted">${this.esc(c.partner)} · ${c.duration} phút</div><div style="margin-top:8px"><span class="price">${Store.money(c.promoPrice || c.price)}</span>${c.promoPrice ? `<span class="muted" style="text-decoration:line-through;margin-left:8px">${Store.money(c.price)}</span>` : ""}</div><div class="muted">${isSession ? `Gói ${sessions} buổi · ${Store.expiryLabel(c)}` : `Tặng thêm ${Store.money(c.bonus)} · ${Store.expiryLabel(c)}`}</div><div class="btn-row" style="margin-top:10px"><button class="icon-btn" data-card-edit="${c.id}">✎ Sửa</button>${this.canDelete() ? `<button class="icon-btn" data-card-del="${c.id}">🗑 Xóa</button>` : ""}</div></div></article>`;
    }).join("");
    const services = d.services.map((s) => `<tr><td><div class="person">${this.avatar(s.image, s.name)}<div>${this.esc(s.name)}<div class="muted">${s.online ? "Hiển thị sàn iSpa" : ""}</div></div></div></td><td>${this.esc(s.category)}</td><td>${s.duration} phút</td><td>${Store.money(Store.serviceUnit(s))}${s.promoPrice ? `<div class="muted" style="text-decoration:line-through">${Store.money(s.price)}</div>` : ""}</td><td><div class="btn-row"><button class="icon-btn" data-svc-edit="${s.id}">✎ Sửa</button>${this.canDelete() ? `<button class="icon-btn" data-svc-del="${s.id}">🗑 Xóa</button>` : ""}</div></td></tr>`).join("");
    return this.shell(`
      <div class="tabs"><button class="tab ${tab === "svc" ? "active" : ""}" data-tab="svc">Dịch vụ</button><button class="tab ${tab === "cards" ? "active" : ""}" data-tab="cards">Thẻ giá trị</button></div>
      <div id="tab-svc" ${tab === "svc" ? "" : "hidden"}><div class="toolbar"><span class="muted">Thêm dịch vụ vào danh mục đã tạo.</span><button class="btn btn-gold" id="add-svc">Thêm mới</button></div><div class="panel" style="padding:8px 16px"><table><thead><tr><th>Tên dịch vụ</th><th>Danh mục</th><th>Thời gian</th><th>Giá</th><th></th></tr></thead><tbody>${services}</tbody></table></div></div>
      <div id="tab-cards" ${tab === "cards" ? "" : "hidden"}><div class="toolbar"><span class="muted">Thẻ tiền và thẻ theo buổi.</span><button class="btn btn-gold" id="add-card">Thêm thẻ giá trị</button></div><div class="grid-cards">${cards || `<p class="muted">Chưa có thẻ.</p>`}</div></div>
    `, "Quản lý dịch vụ", "Thêm, sửa hoặc xóa dịch vụ và thẻ giá trị");
  },
  bindServices() {
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { this.serviceTab = t.dataset.tab; this.render(); }));
    $("#add-card")?.addEventListener("click", () => this.formValueCard());
    $("#add-svc")?.addEventListener("click", () => this.formService());
    document.querySelectorAll("[data-svc-edit]").forEach((b) => { b.onclick = (e) => { e.stopPropagation(); this.formService(b.dataset.svcEdit); }; });
    document.querySelectorAll("[data-svc-del]").forEach((b) => { b.onclick = (e) => { e.stopPropagation(); if (!confirm("Xóa dịch vụ này?")) return; Store.deleteService(b.dataset.svcDel); this.toast("Đã xóa dịch vụ"); this.render(); }; });
    document.querySelectorAll("[data-card-edit]").forEach((b) => { b.onclick = (e) => { e.stopPropagation(); this.formValueCard(b.dataset.cardEdit); }; });
    document.querySelectorAll("[data-card-del]").forEach((b) => { b.onclick = (e) => { e.stopPropagation(); if (!confirm("Xóa thẻ giá trị này?")) return; Store.deleteValueCard(b.dataset.cardDel); this.toast("Đã xóa thẻ"); this.render(); }; });
  },
  formService(id) {
    const editing = id ? Store.get().services.find((s) => s.id === id) : null;
    const v = editing || {};
    const cats = Store.get().categories.filter((c) => c !== "Thẻ giá trị");
    this.openModal(`
      <h3>${editing ? "Sửa dịch vụ" : "Thêm mới dịch vụ"}</h3>
      <form id="svc-form" class="form-grid">
        <div><label>Tên dịch vụ</label><input name="name" required value="${this.esc(v.name || "")}" placeholder="Ví dụ: Liệu trình trẻ hóa da"></div>
        <div><label>Danh mục</label><select name="category" required>${cats.map((c) => `<option ${v.category === c ? "selected" : ""}>${this.esc(c)}</option>`).join("")}</select></div>
        <div><label>Thời gian (phút)</label><input name="duration" type="number" min="0" value="${v.duration ?? 60}"></div>
        <div><label>Giá dịch vụ</label><input name="price" type="number" required min="0" value="${v.price ?? ""}" placeholder="500000"></div>
        <div><label>Giá ưu đãi</label><input name="promoPrice" type="number" min="0" value="${v.promoPrice ?? 0}"></div>
        <div><label>Hoa hồng (%)</label><input name="commission" type="number" min="0" max="100" value="${v.commission ?? 0}"></div>
        <div class="full"><label>Mô tả</label><textarea name="description" placeholder="Thêm thông tin về liệu trình...">${this.esc(v.description || "")}</textarea></div>
        <div class="full"><label>Hình ảnh</label><input name="imageFile" type="file" accept="image/*"></div>
        <div class="full"><label><input type="checkbox" name="online" ${v.online ? "checked" : ""}> Hiển thị sàn iSpa</label></div>
        <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    $("#svc-form").addEventListener("submit", (e) => {
      e.preventDefault(); const f = e.target;
      const done = (image) => {
        const payload = { name: f.name.value, category: f.category.value, duration: Number(f.duration.value || 0), price: Number(f.price.value), promoPrice: Number(f.promoPrice.value || 0), description: f.description.value, image: image || v.image || "", commission: Number(f.commission.value || 0), online: f.online.checked };
        try { if (editing) { Store.updateService(id, payload); this.toast("Đã cập nhật"); } else { Store.addService(payload); this.toast("Đã thêm dịch vụ"); } this.closeModal(); this.serviceTab = "svc"; this.render(); } catch (err) { this.toast(err.message); }
      };
      const file = f.imageFile.files[0];
      if (file) this.readImage(file, done); else done("");
    });
  },
  formValueCard(id) {
    const editing = id ? Store.get().valueCards.find((c) => c.id === id) : null;
    const v = editing || {};
    const d = Store.get();
    this.openModal(`
      <h3>${editing ? "Sửa thẻ giá trị" : "Thêm thẻ giá trị"}</h3>
      <form id="card-form" class="form-grid">
        <div class="full"><label>Loại thẻ</label><select name="cardType" id="card-type"><option value="money" ${v.cardType !== "session" ? "selected" : ""}>Thẻ tiền (số dư)</option><option value="session" ${v.cardType === "session" ? "selected" : ""}>Thẻ buổi (số buổi)</option></select></div>
        <div><label>Đối tác / Chi nhánh</label><select name="partner">${d.branches.map((b) => `<option ${v.partner === b ? "selected" : ""}>${this.esc(b)}</option>`).join("")}</select></div>
        <div><label>Tên thẻ</label><input name="name" required value="${this.esc(v.name || "")}"></div>
        <div><label>Danh mục</label><select name="category">${d.categories.map((c) => `<option ${(v.category || "Thẻ giá trị") === c ? "selected" : ""}>${this.esc(c)}</option>`).join("")}</select></div>
        <div><label>Thời gian (phút)</label><input name="duration" type="number" min="0" value="${v.duration ?? 60}"></div>
        <div><label>Giá bán thẻ</label><input name="price" type="number" required min="0" value="${v.price ?? ""}"></div>
        <div><label>Giá ưu đãi</label><input name="promoPrice" type="number" min="0" value="${v.promoPrice ?? ""}"></div>
        <div class="money-only"><label>Tặng thêm (tiền)</label><input name="bonus" type="number" min="0" value="${v.bonus ?? 0}"></div>
        <div class="session-only"><label>Số buổi</label><input name="sessions" type="number" min="1" value="${v.sessions ?? 10}"></div>
        <div class="session-only"><label>Tặng thêm buổi</label><input name="bonusSessions" type="number" min="0" value="${v.bonusSessions ?? 0}"></div>
        <div><label>Hạn sử dụng</label><select name="expiryType"><option value="unlimited" ${v.expiryType === "unlimited" ? "selected" : ""}>Vô thời hạn</option><option value="date" ${v.expiryType === "date" ? "selected" : ""}>Ngày cụ thể</option><option value="duration" ${v.expiryType === "duration" ? "selected" : ""}>Số ngày</option></select><input name="expiryValue" value="${this.esc(v.expiryValue || "")}" placeholder="YYYY-MM-DD hoặc số ngày" style="margin-top:8px"></div>
        <div class="full"><label>Mô tả</label><textarea name="description">${this.esc(v.description || "")}</textarea></div>
        <div><label>Hình ảnh</label><input name="imageFile" type="file" accept="image/*"></div>
        <div><label>Hoa hồng (%)</label><input name="commission" type="number" min="0" max="100" value="${v.commission ?? 0}"></div>
        <div class="full"><label><input type="checkbox" name="online" ${v.online ? "checked" : ""}> Đặt Online — sàn iSpa</label></div>
        <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    const form = $("#card-form");
    const toggleFields = () => { const isSession = form.cardType.value === "session"; form.querySelectorAll(".money-only").forEach((el) => el.style.display = isSession ? "none" : ""); form.querySelectorAll(".session-only").forEach((el) => el.style.display = isSession ? "" : "none"); };
    form.cardType.addEventListener("change", toggleFields); toggleFields();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const done = (image) => {
        const isSession = fd.get("cardType") === "session";
        const payload = { cardType: fd.get("cardType"), partner: fd.get("partner"), name: fd.get("name"), category: fd.get("category"), duration: Number(fd.get("duration") || 0), price: Number(fd.get("price")), promoPrice: Number(fd.get("promoPrice") || 0), bonus: isSession ? 0 : Number(fd.get("bonus") || 0), sessions: isSession ? Number(fd.get("sessions") || 0) : 0, bonusSessions: isSession ? Number(fd.get("bonusSessions") || 0) : 0, expiryType: fd.get("expiryType"), expiryValue: fd.get("expiryValue"), description: fd.get("description"), image: image || v.image || "", commission: Number(fd.get("commission") || 0), online: form.online.checked };
        try { if (editing) { Store.updateValueCard(id, payload); this.toast("Đã cập nhật thẻ"); } else { Store.addValueCard(payload); this.toast("Đã lưu thẻ giá trị"); } this.closeModal(); this.serviceTab = "cards"; this.render(); } catch (err) { this.toast(err.message); }
      };
      const file = form.imageFile.files[0];
      if (file) this.readImage(file, done); else done("");
    });
  },

  // BOOKINGS
  bookingRow(b) {
    const select = `<select class="status-select" data-bk-status="${b.id}">${Store.BOOKING_STATUSES.map((s) => `<option ${s === b.status ? "selected" : ""}>${s}</option>`).join("")}</select>`;
    return `<tr><td>${b.id}</td><td>${this.esc(b.customerName)}<div class="muted">${this.esc(b.phone)}</div></td><td>${(b.at || "").replace("T", " ")}</td><td>${this.esc(b.item)}</td><td>${this.esc(b.technician || "—")}</td><td>${this.esc(b.payMethod || "—")}</td><td>${Store.money(b.total)}</td><td>${select}</td><td><div class="btn-row"><button class="icon-btn" data-bk-print="${b.id}" title="In lại">🖨</button><button class="icon-btn" data-bk-edit="${b.id}" title="Sửa">✎</button>${this.canDelete() ? `<button class="icon-btn" data-bk-del="${b.id}" title="Xóa">🗑</button>` : ""}</div></td></tr>`;
  },
  filterBookings() {
    const f = this.bookingFilters;
    const user = this.currentUser();
    let list = Store.get().bookings.slice();
    if (this.isTechnician() && user) list = list.filter((b) => b.technician === user.name);
    if (f.from) list = list.filter((b) => (b.at || "").slice(0, 10) >= f.from);
    if (f.to) list = list.filter((b) => (b.at || "").slice(0, 10) <= f.to);
    if (f.status) list = list.filter((b) => b.status === f.status);
    if (f.tech) list = list.filter((b) => b.technician === f.tech);
    if (f.q) { const q = f.q.toLowerCase(); list = list.filter((b) => `${b.customerName} ${b.phone} ${b.id}`.toLowerCase().includes(q)); }
    return list;
  },
  viewBookings() {
    const f = this.bookingFilters;
    const filtered = this.sortRows(this.filterBookings(), this.bookingSort);
    const p = this.paginate(filtered, this.bookingPage, this.pageSize);
    const rows = p.rows.map((b) => this.bookingRow(b)).join("");
    const techList = Store.technicians();
    return this.shell(`
      <div class="toolbar"><div class="btn-row"><button class="btn btn-gold" id="add-order">Thêm mới</button><button class="btn btn-dark" id="add-sale">Bán thẻ giá trị</button><button class="btn btn-ghost" id="add-pay">Thanh toán bằng thẻ</button></div></div>
      <div class="panel" style="padding:12px 16px;margin-bottom:12px">
        <div class="filter-bar">
          <input class="search" data-bk-filter="q" placeholder="Tìm tên, SĐT, mã đơn" value="${this.esc(f.q)}">
          <select data-bk-filter="status"><option value="">Tất cả trạng thái</option>${Store.BOOKING_STATUSES.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          <select data-bk-filter="tech"><option value="">Tất cả KTV</option>${techList.map((t) => `<option ${f.tech === t.name ? "selected" : ""}>${this.esc(t.name)}</option>`).join("")}</select>
          <input type="date" data-bk-filter="from" value="${f.from}" title="Từ ngày"><input type="date" data-bk-filter="to" value="${f.to}" title="Đến ngày">
        </div>
      </div>
      <div class="panel" style="padding:8px 16px">
        <table>
          <thead><tr>${this.sortTh("Mã", "id", this.bookingSort, "bookings")}${this.sortTh("Khách", "customerName", this.bookingSort, "bookings")}${this.sortTh("Thời gian", "at", this.bookingSort, "bookings")}<th>Hạng mục</th>${this.sortTh("KTV", "technician", this.bookingSort, "bookings")}<th>Thanh toán</th>${this.sortTh("Tổng", "total", this.bookingSort, "bookings")}${this.sortTh("Trạng thái", "status", this.bookingSort, "bookings")}<th></th></tr></thead>
          <tbody id="bk-tbody">${rows || `<tr><td colspan="9" class="muted">Không có đơn</td></tr>`}</tbody>
        </table>${this.pager(p.page, p.total, "bookings", p.totalRows)}
      </div>
    `, "Quản lý đặt lịch", "Sửa/xóa, đổi trạng thái, in lại, lọc và phân trang");
  },
  bindBookingRows() {
    document.querySelectorAll("[data-bk-status]").forEach((sel) => { sel.onchange = () => { try { Store.updateBookingStatus(sel.dataset.bkStatus, sel.value); this.toast("Đã cập nhật trạng thái"); this.render(); } catch (err) { this.toast(err.message); this.render(); } }; });
    document.querySelectorAll("[data-bk-edit]").forEach((b) => { b.onclick = () => this.formEditBooking(b.dataset.bkEdit); });
    document.querySelectorAll("[data-bk-del]").forEach((b) => { b.onclick = () => { if (!confirm("Xóa đơn hàng? Nếu đã thanh toán bằng thẻ, sẽ hoàn lại.")) return; Store.deleteBooking(b.dataset.bkDel); this.toast("Đã xóa đơn"); this.render(); }; });
    document.querySelectorAll("[data-bk-print]").forEach((b) => { b.onclick = () => { const booking = Store.get().bookings.find((x) => x.id === b.dataset.bkPrint); if (!booking) return; const customer = Store.get().customers.find((c) => c.id === booking.customerId) || { name: booking.customerName, phone: booking.phone }; this.printInvoice(booking, customer); }; });
  },
  bindBookings() {
    $("#add-order").onclick = () => this.formOrder(); $("#add-sale").onclick = () => this.formBooking("sale"); $("#add-pay").onclick = () => this.formBooking("service");
    document.querySelectorAll("[data-bk-filter]").forEach((inp) => {
      const evt = inp.tagName === "SELECT" || inp.type === "date" ? "change" : "input";
      inp.addEventListener(evt, () => {
        this.bookingFilters[inp.dataset.bkFilter] = inp.value; this.bookingPage = 1;
        const filtered = this.sortRows(this.filterBookings(), this.bookingSort);
        const p = this.paginate(filtered, 1, this.pageSize);
        $("#bk-tbody").innerHTML = p.rows.map((b) => this.bookingRow(b)).join("") || `<tr><td colspan="9" class="muted">Không có đơn</td></tr>`;
        this.bindBookingRows();
        const pag = document.querySelector(".pagination"); if (pag) pag.outerHTML = this.pager(p.page, p.total, "bookings", p.totalRows);
        this.bindSortAndPager("bookings");
      });
    });
    this.bindBookingRows(); this.bindSortAndPager("bookings");
  },
  formEditBooking(id) {
    const b = Store.get().bookings.find((x) => x.id === id);
    if (!b) return;
    const isOrder = b.type === "order";
    this.openModal(`
      <h3>Sửa đơn ${b.id}</h3>
      <form id="bk-edit-form" class="form-grid">
        <div class="full"><label>Khách</label><input value="${this.esc(b.customerName)} · ${this.esc(b.phone)}" readonly></div>
        <div class="full"><label>Hạng mục</label><input value="${this.esc(b.item)}" readonly></div>
        <div><label>Thời gian</label><input name="at" type="datetime-local" value="${b.at}" required></div>
        <div><label>KTV</label><select name="technician">${this.techOptions(b.technician)}</select></div>
        <div><label>Chi nhánh</label><select name="branch"><option value="">—</option>${this.branchOptions(b.branch)}</select></div>
        <div><label>Trạng thái</label><select name="status">${Store.BOOKING_STATUSES.map((s) => `<option ${s === b.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        ${isOrder ? `<div><label>Loại giảm</label><select name="discountType"><option value="none" ${b.discountType === "none" ? "selected" : ""}>Không</option><option value="percent" ${b.discountType === "percent" ? "selected" : ""}>%</option><option value="amount" ${b.discountType === "amount" ? "selected" : ""}>Số tiền</option></select></div><div><label>Giá trị giảm</label><input name="discountValue" type="number" min="0" value="${b.discountValue || 0}"></div>` : ""}
        <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    $("#bk-edit-form").addEventListener("submit", (e) => {
      e.preventDefault(); const f = e.target;
      try {
        const payload = { at: f.at.value, technician: f.technician.value, branch: f.branch.value };
        if (isOrder) { payload.discountType = f.discountType.value; payload.discountValue = Number(f.discountValue.value || 0); const { discount, total } = Store.applyDiscount(b.subtotal, payload.discountType, payload.discountValue); payload.discount = discount; payload.total = total; if (b.revenueRecognized !== undefined && b.revenueRecognized !== 0) payload.revenueRecognized = total; }
        Store.updateBooking(id, payload);
        if (f.status.value !== b.status) Store.updateBookingStatus(id, f.status.value);
        this.closeModal(); this.toast("Đã cập nhật đơn"); this.render();
      } catch (err) { this.toast(err.message); }
    });
  },
  lookupCustomer(phoneInput, nameInput, extra) { const found = Store.findCustomerByPhone(phoneInput.value); if (found) { nameInput.value = found.name; extra?.(found); } else extra?.(null); },
  collectLines(root) { return [...root.querySelectorAll(".line-row")].map((row) => ({ serviceId: row.querySelector("[name=serviceId]").value, qty: Number(row.querySelector("[name=qty]").value || 1) })); },
  bindLineRows(box) {
    const add = () => {
      const wrap = document.createElement("div");
      wrap.className = "line-row";
      wrap.innerHTML = `<div><label>Dịch vụ</label><select name="serviceId" required><option value="">— Chọn —</option>${this.serviceOptions()}</select></div><div><label>SL</label><input name="qty" type="number" min="1" value="1" required></div><button type="button" class="icon-btn rm-line">✕</button>`;
      box.appendChild(wrap);
      wrap.querySelector(".rm-line").onclick = () => { if (box.querySelectorAll(".line-row").length > 1) wrap.remove(); };
    };
    add(); return add;
  },
  formOrder(preset) {
    const c = preset || {};
    const user = this.currentUser();
    const defaultBranch = user?.address || Store.get().branches[0];
    this.openModal(`
      <h3>Thêm đơn hàng mới</h3>
      <form id="order-form" class="form-grid">
        <div><label>SĐT</label><input name="phone" required value="${this.esc(c.phone || "")}" placeholder="0901234567"><div class="hint" id="lookup-hint">Nhập SĐT — khách cũ tự hiện tên</div></div>
        <div><label>Tên khách</label><input name="name" required value="${this.esc(c.name || "")}"></div>
        <div class="full"><label>Thời gian hẹn</label><input name="at" type="datetime-local" value="${this.nowLocal()}" required></div>
        <div class="full"><div id="line-box"></div><button type="button" class="btn btn-ghost" id="add-line">+ Thêm dịch vụ</button></div>
        <div><label>KTV</label><select name="technician">${this.techOptions()}</select></div>
        <div><label>Chi nhánh</label><select name="branch">${this.branchOptions(defaultBranch)}</select></div>
        <div><label>Giảm giá</label><select name="discountType"><option value="none">Không</option><option value="percent">%</option><option value="amount">Số tiền</option></select><input name="discountValue" type="number" min="0" value="0" style="margin-top:8px"></div>
        <div><label>Thanh toán</label><select name="payMethod"><option>Tiền mặt</option><option>Chuyển khoản</option><option>Quẹt thẻ</option></select></div>
        <div class="full btn-row"><button class="btn btn-gold" type="submit" data-act="print">Thanh toán & in</button><button class="btn btn-ghost" type="submit" data-act="save">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    const form = $("#order-form");
    const addLine = this.bindLineRows($("#line-box"));
    $("#add-line").onclick = addLine;
    if (c.phone) this.lookupCustomer(form.phone, form.name, () => {});
    form.phone.addEventListener("input", () => this.lookupCustomer(form.phone, form.name, (found) => { $("#lookup-hint").textContent = found ? `Khách đã lưu: ${found.name}` : "Khách mới — nhập tên"; }));
    let act = "print";
    form.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", () => (act = btn.dataset.act)));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        const result = Store.createOrder({ phone: form.phone.value, name: form.name.value, at: form.at.value, lines: this.collectLines(form), technician: form.technician.value, discountType: form.discountType.value, discountValue: form.discountValue.value, payMethod: form.payMethod.value, paid: act === "print", branch: form.branch.value });
        if (act === "print") this.printInvoice(result.booking, result.customer);
        this.closeModal(); this.toast(act === "print" ? "Đã thanh toán và in" : "Đã lưu đơn"); this.render();
      } catch (err) { this.toast(err.message); }
    });
  },
  formBooking(mode) {
    const d = Store.get();
    const isSale = mode === "sale";
    const user = this.currentUser();
    const defaultBranch = user?.address || d.branches[0];
    this.openModal(`
      <h3>${isSale ? "Bán thẻ giá trị" : "Thanh toán bằng thẻ giá trị"}</h3>
      <form id="bk-form" class="form-grid">
        <div><label>SĐT khách</label><input name="phone" required placeholder="0901234567"><div class="hint" id="lookup-hint">Nhập SĐT đã lưu</div></div>
        <div><label>Tên khách</label><input name="name" ${isSale ? "" : "readonly"}></div>
        <div><label>${isSale ? "Thời gian hẹn" : "Thời gian làm DV"}</label><input name="at" type="datetime-local" value="${this.nowLocal()}" required></div>
        <div><label>Chi nhánh</label><select name="branch">${this.branchOptions(defaultBranch)}</select></div>
        ${isSale ? `
          <div><label>Thẻ giá trị</label><select name="templateId" required><option value="">— Chọn —</option>${d.valueCards.map((c) => `<option value="${c.id}">${this.esc(c.name)} · ${Store.money(c.promoPrice || c.price)}${c.cardType === "session" ? ` · ${Number(c.sessions || 0) + Number(c.bonusSessions || 0)} buổi` : ""}</option>`).join("")}</select></div>
          <div><label>Thanh toán</label><select name="payMethod"><option>Tiền mặt</option><option>Chuyển khoản</option><option>Quẹt thẻ</option></select></div>
        ` : `
          <div><label>Dịch vụ</label><select name="serviceId" required><option value="">— Chọn —</option>${this.serviceOptions()}</select></div>
          <div><label>SL</label><input name="qty" type="number" min="1" value="1"></div>
          <div><label>KTV</label><select name="technician">${this.techOptions()}</select></div>
          <div><label>Giảm giá</label><select name="discountType"><option value="none">Không</option><option value="percent">%</option><option value="amount">Số tiền</option></select><input name="discountValue" type="number" min="0" value="0" style="margin-top:8px"></div>
          <div class="full"><label>Thẻ giá trị</label><select name="ownedCardId" required><option value="">Nhập SĐT để tải</option></select></div>
          <div class="full" id="split-box" hidden><div class="split-pay"><div><label>Số tiền dùng thẻ</label><input name="cardAmount" type="number" min="0" value="0"></div><div><label>Phần còn lại thanh toán bằng</label><select name="remainderMethod"><option>Tiền mặt</option><option>Chuyển khoản</option><option>Quẹt thẻ</option></select></div></div></div>
        `}
        <div class="full btn-row">${isSale ? `<button class="btn btn-gold" type="submit">Thanh toán</button>` : `<button class="btn btn-gold" type="submit" data-act="print">Thanh toán & In</button><button class="btn btn-dark" type="submit" data-act="pay">Thanh toán</button><button class="btn btn-ghost" type="submit" data-act="save">Lưu</button>`}<button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    const form = $("#bk-form");
    const fillCards = (customer) => {
      const sel = form.ownedCardId; if (!sel) return;
      const all = customer?.cards || [];
      const valid = all.filter((c) => !Store.isCardExpired(c) && (c.cardType === "session" ? (c.sessions || 0) > 0 : c.balance > 0));
      if (!customer || !valid.length) { sel.innerHTML = `<option value="">Không có thẻ hợp lệ</option>`; $("#lookup-hint").textContent = customer ? (all.length ? "Tất cả thẻ đã hết hạn / hết buổi" : "Khách chưa có thẻ") : "Nhập SĐT khách đã mua thẻ"; $("#split-box").hidden = true; return; }
      $("#lookup-hint").textContent = `Khách: ${customer.name} — ${valid.length}/${all.length} thẻ hợp lệ`;
      sel.innerHTML = valid.map((c) => { const desc = c.cardType === "session" ? `còn ${c.sessions} buổi` : `số dư ${Store.money(c.balance)}`; const exp = c.expiryDate ? ` · HH ${c.expiryDate}` : ""; return `<option value="${c.id}">${this.esc(c.name)} · ${desc}${exp}</option>`; }).join("");
      updateSplitBox();
    };
    const updateSplitBox = () => {
      const sel = form.ownedCardId; const box = $("#split-box"); if (!sel || !box) return;
      const customer = Store.findCustomerByPhone(form.phone.value);
      const card = customer?.cards.find((c) => c.id === sel.value);
      if (!card || card.cardType === "session") { box.hidden = true; return; }
      box.hidden = false;
      const amtInput = form.cardAmount;
      if (amtInput.value === "0" || !amtInput.value) { const sv = Store.getService(form.serviceId.value); const subtotal = sv ? Store.serviceUnit(sv) * Number(form.qty?.value || 1) : 0; const { total } = Store.applyDiscount(subtotal, form.discountType.value, form.discountValue.value); amtInput.value = Math.min(card.balance, total); }
    };
    form.phone.addEventListener("input", () => this.lookupCustomer(form.phone, form.name, fillCards));
    form.ownedCardId?.addEventListener("change", updateSplitBox);
    let act = isSale ? "pay" : "print";
    form.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", () => { act = btn.dataset.act; }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        if (isSale) { Store.sellValueCard({ phone: form.phone.value, name: form.name.value, at: form.at.value, templateId: form.templateId.value, payMethod: form.payMethod.value, branch: form.branch.value }); this.closeModal(); this.toast("Đã thanh toán đơn bán thẻ"); this.render(); return; }
        if (act === "save") { const sv = Store.getService(form.serviceId.value); Store.saveDraft({ type: "service", customerName: form.name.value, phone: form.phone.value, at: form.at.value, item: sv ? `${sv.name} x${form.qty.value}` : "Dịch vụ", technician: form.technician.value, payMethod: "Thẻ giá trị (nháp)", total: sv ? Store.serviceUnit(sv) * Number(form.qty.value || 1) : 0, branch: form.branch.value }); this.closeModal(); this.toast("Đã lưu đơn"); this.render(); return; }
        const result = Store.payWithCard({ phone: form.phone.value, name: form.name.value, at: form.at.value, serviceId: form.serviceId.value, qty: form.qty.value, technician: form.technician.value, ownedCardId: form.ownedCardId.value, discountType: form.discountType.value, discountValue: form.discountValue.value, cardAmount: Number(form.cardAmount?.value ?? 0), remainderMethod: form.remainderMethod?.value || "", branch: form.branch.value });
        if (act === "print") this.printInvoice(result.booking, result.customer);
        this.closeModal(); this.toast("Đã hoàn tất đơn"); this.render();
      } catch (err) { this.toast(err.message); }
    });
  },
  printInvoice(booking, customer) {
    const now = new Date(); const dateStr = now.toLocaleString("vi-VN");
    const items = (booking.lines || []).map((l) => `<tr><td>${this.esc(l.name)}</td><td class="ta-c">${l.qty}</td><td class="ta-r">${Store.money(l.unit)}</td><td class="ta-r">${Store.money(l.amount)}</td></tr>`).join("");
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(`iSpa|${booking.id}|${booking.total}`)}`;
    const sheet = $("#print-sheet");
    sheet.innerHTML = `
      <div class="invoice">
        <div class="inv-header"><div class="inv-brand"><div class="inv-logo">i</div><div><div class="inv-name">iSpa Pro</div><div class="inv-tag">Professional Spa OS</div></div></div><div class="inv-meta"><div class="inv-title">HÓA ĐƠN</div><div class="inv-code">#${this.esc(booking.id)}</div><div class="inv-date">${dateStr}</div></div></div>
        <div class="inv-section"><div class="inv-row"><span>Khách hàng</span><strong>${this.esc(customer.name)}</strong></div><div class="inv-row"><span>Điện thoại</span><strong>${this.esc(customer.phone)}</strong></div>${booking.at ? `<div class="inv-row"><span>Thời gian</span><strong>${(booking.at).replace("T", " ")}</strong></div>` : ""}${booking.technician ? `<div class="inv-row"><span>KTV</span><strong>${this.esc(booking.technician)}</strong></div>` : ""}${booking.branch ? `<div class="inv-row"><span>Chi nhánh</span><strong>${this.esc(booking.branch)}</strong></div>` : ""}</div>
        ${items ? `<table class="inv-table"><thead><tr><th>Dịch vụ</th><th class="ta-c">SL</th><th class="ta-r">Đơn giá</th><th class="ta-r">T.Tiền</th></tr></thead><tbody>${items}</tbody></table>` : `<div class="inv-section"><div class="inv-row"><span>Hạng mục</span><strong>${this.esc(booking.item)}</strong></div></div>`}
        <div class="inv-totals"><div class="inv-row"><span>Tạm tính</span><strong>${Store.money(booking.subtotal ?? booking.total)}</strong></div>${booking.discount ? `<div class="inv-row"><span>Giảm giá</span><strong>-${Store.money(booking.discount)}</strong></div>` : ""}<div class="inv-row inv-total-final"><span>TỔNG CỘNG</span><strong>${Store.money(booking.total ?? booking.subtotal ?? 0)}</strong></div><div class="inv-row"><span>Thanh toán</span><strong>${this.esc(booking.payMethod || "—")}</strong></div></div>
        <div class="inv-footer"><img class="qr-code" src="${qr}" alt="QR" onerror="this.style.display='none'"><div><div class="inv-thanks">Cảm ơn quý khách!</div><div class="inv-note">Hẹn gặp lại tại iSpa Pro</div><div class="inv-contact">Hotline: 1900-xxxx · www.ispa.vn</div></div></div>
      </div>
    `; window.print();
  },

  // CUSTOMERS
  customerRow(c) {
    return `<tr><td class="clickable" data-kh="${c.id}"><div class="person">${this.avatar(c.avatar, c.name)}<div>${this.esc(c.name)}<div class="muted">${this.esc(c.email || "")}</div></div></div></td><td class="clickable" data-kh="${c.id}">${this.esc(c.phone)}</td><td>${this.esc(c.address || "—")}</td><td>${c.cards.length} thẻ</td><td>${Store.money(c.cards.reduce((s, x) => s + (x.balance || 0), 0))}</td><td><div class="btn-row"><button class="icon-btn" data-edit="${c.id}" title="Edit">✎</button>${this.canDelete() ? `<button class="icon-btn" data-del-kh="${c.id}" title="Xóa">🗑</button>` : ""}</div></td></tr>`;
  },
  viewCustomers() {
    const q = this.searchQ || "";
    const filtered = Store.get().customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
    const sorted = this.sortRows(filtered, this.customerSort);
    const p = this.paginate(sorted, this.customerPage, this.pageSize);
    const rows = p.rows.map((c) => this.customerRow(c)).join("");
    return this.shell(`
      <div class="toolbar"><input class="search" id="kh-search" placeholder="Tìm khách theo tên hoặc SĐT" value="${this.esc(q)}"><button class="btn btn-gold" id="add-kh">Thêm mới</button></div>
      <div class="panel" style="padding:8px 16px">
        <table><thead><tr>${this.sortTh("Khách hàng", "name", this.customerSort, "customers")}${this.sortTh("Điện thoại", "phone", this.customerSort, "customers")}<th>Địa chỉ</th><th>Thẻ</th>${this.sortTh("Tổng số dư", "totalBalance", this.customerSort, "customers")}<th></th></tr></thead><tbody>${rows}</tbody></table>${this.pager(p.page, p.total, "customers", p.totalRows)}
      </div>
    `, "Quản lý khách hàng", "Thêm, sửa, xóa khách và tạo đơn từ tab Đặt lịch");
  },
  bindCustomers() {
    const bindRows = () => {
      document.querySelectorAll("[data-kh]").forEach((el) => el.addEventListener("click", () => this.go("customer", { customerId: el.dataset.kh, customerTab: "cards" })));
      document.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); this.go("customer", { customerId: btn.dataset.edit, customerTab: "bookings" }); }));
      document.querySelectorAll("[data-del-kh]").forEach((btn) => btn.addEventListener("click", (e) => { e.stopPropagation(); if (!confirm("Xóa khách hàng này và toàn bộ đơn của họ?")) return; Store.deleteCustomer(btn.dataset.delKh); this.toast("Đã xóa khách"); this.render(); }));
    };
    bindRows();
    $("#add-kh").onclick = () => this.formCustomer();
    $("#kh-search").addEventListener("input", (e) => {
      this.searchQ = e.target.value; this.customerPage = 1;
      const filtered = Store.get().customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(this.searchQ.toLowerCase()));
      const p = this.paginate(this.sortRows(filtered, this.customerSort), 1, this.pageSize);
      $("tbody").innerHTML = p.rows.map((c) => this.customerRow(c)).join("");
      bindRows();
      const pag = document.querySelector(".pagination"); if (pag) pag.outerHTML = this.pager(p.page, p.total, "customers", p.totalRows);
      this.bindSortAndPager("customers");
    });
    this.bindSortAndPager("customers");
  },
  formCustomer() {
    this.openModal(`
      <h3>Thêm khách hàng mới</h3>
      <form id="kh-form" class="form-grid">
        <div><label>Tên</label><input name="name" required></div>
        <div><label>SĐT</label><input name="phone" required></div>
        <div><label>Email</label><input name="email" type="email"></div>
        <div><label>Sinh nhật</label><input name="birthday" type="date"></div>
        <div><label>Mật khẩu</label><input name="password" value="123456"><div class="hint">Mật khẩu đăng nhập app khách</div></div>
        <div><label>Địa chỉ</label><input name="address"></div>
        <div class="full"><label>Avatar</label><input name="imageFile" type="file" accept="image/*"></div>
        <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    $("#kh-form").addEventListener("submit", (e) => {
      e.preventDefault(); const f = e.target;
      this.readImage(f.imageFile.files[0], (avatar) => {
        try { Store.addCustomer({ name: f.name.value, phone: f.phone.value, email: f.email.value, address: f.address.value, birthday: f.birthday.value, password: f.password.value, avatar }); this.closeModal(); this.toast("Đã lưu khách mới"); this.render(); } catch (err) { this.toast(err.message); }
      });
    });
  },
  viewCustomer() {
    const c = Store.get().customers.find((x) => x.id === this.customerId);
    if (!c) return this.viewCustomers();
    const tab = this.customerTab || "cards";
    const cards = (c.cards || []).map((card) => {
      const expired = Store.isCardExpired(card); const isSession = card.cardType === "session";
      const hist = card.history.map((h) => `<div class="item"><strong>${this.esc(h.note)}</strong><span class="muted">${h.at.replace("T", " ")} · ${h.amount ? (h.amount > 0 ? "+" : "") + Store.money(h.amount) + " · " : ""}còn ${Store.money(h.balanceAfter)}${isSession && h.sessionsAfter !== undefined ? ` · ${h.sessionsAfter} buổi` : ""}</span></div>`).join("");
      const balanceText = isSession ? `${card.sessions} buổi` : Store.money(card.balance);
      const originalText = isSession ? `${card.originalSessions} buổi` : Store.money(card.original);
      return `<div class="panel" style="padding:16px;margin-bottom:12px"><div class="toolbar"><div><h4 style="margin:0">${this.esc(card.name)} ${expired ? `<span class="status-badge st-cancelled">Hết hạn</span>` : ""}</h4><div class="muted">Hạn: ${card.expiryDate || card.expiry} · Gốc ${originalText}</div></div><div class="price">${balanceText}</div></div><button class="btn btn-ghost hist-toggle" data-card="${card.id}">Lịch sử</button><div class="timeline history" id="hist-${card.id}" hidden>${hist || `<p class="muted">Chưa có giao dịch</p>`}</div></div>`;
    }).join("");
    const books = Store.get().bookings.filter((b) => b.customerId === c.id || b.phone === c.phone).map((b) => `<tr><td>${(b.at || "").replace("T", " ")}</td><td>${this.esc(b.item)}</td><td>${this.esc(b.technician || "—")}</td><td>${Store.money(b.total)}</td><td>${this.statusBadge(b.status)}</td></tr>`).join("");
    return this.shell(`
      <button class="btn btn-ghost" data-go="customers" style="margin-bottom:12px">← Danh sách khách</button>
      <div class="hero" style="grid-template-columns:1fr;margin-bottom:16px"><div class="hero-person">${this.avatar(c.avatar, c.name, "lg")}<div><h3>${this.esc(c.name)}</h3><p>${this.esc(c.phone)}${c.email ? " · " + this.esc(c.email) : ""}${c.address ? " · " + this.esc(c.address) : ""}${c.birthday ? " · 🎂 " + c.birthday : ""}</p></div></div></div>
      <div class="tabs"><button class="tab ${tab === "info" ? "active" : ""}" data-ctab="info">Thông tin</button><button class="tab ${tab === "bookings" ? "active" : ""}" data-ctab="bookings">Đặt lịch</button><button class="tab ${tab === "cards" ? "active" : ""}" data-ctab="cards">Thẻ giá trị</button></div>
      <div id="ctab-info" ${tab === "info" ? "" : "hidden"} class="panel" style="padding:16px"><p>Họ tên: <strong>${this.esc(c.name)}</strong></p><p>Điện thoại: <strong>${this.esc(c.phone)}</strong></p><p>Email: <strong>${this.esc(c.email || "—")}</strong></p><p>Sinh nhật: <strong>${c.birthday || "—"}</strong></p><p>Địa chỉ: <strong>${this.esc(c.address || "—")}</strong></p><p>Số thẻ: <strong>${c.cards.length}</strong></p></div>
      <div id="ctab-bookings" ${tab === "bookings" ? "" : "hidden"}><div class="toolbar"><span class="muted">Đơn của ${this.esc(c.name)}</span><button class="btn btn-gold" id="add-order-kh">Thêm mới</button></div><div class="panel" style="padding:8px 16px"><table><thead><tr><th>Thời gian</th><th>Hạng mục</th><th>KTV</th><th>Tổng</th><th>Trạng thái</th></tr></thead><tbody>${books || `<tr><td colspan="5" class="muted">Chưa có đơn</td></tr>`}</tbody></table></div></div>
      <div id="ctab-cards" ${tab === "cards" ? "" : "hidden"}>${cards || `<p class="muted">Khách chưa có thẻ giá trị.</p>`}</div>
    `, "Chi tiết khách hàng", "Tab Đặt lịch để thêm đơn · Tab Thẻ giá trị để xem số dư");
  },
  bindCustomer() {
    document.querySelectorAll("[data-ctab]").forEach((t) => t.addEventListener("click", () => { this.customerTab = t.dataset.ctab; this.render(); }));
    document.querySelectorAll(".hist-toggle").forEach((b) => b.addEventListener("click", () => { const box = $(`#hist-${b.dataset.card}`); box.hidden = !box.hidden; }));
    $("#add-order-kh")?.addEventListener("click", () => { const c = Store.get().customers.find((x) => x.id === this.customerId); this.formOrder(c); });
  },

  // STAFF
  viewStaff() {
    const rows = Store.get().staff.map((n) => `<tr><td><div class="person">${this.avatar(n.avatar, n.name)}<div>${this.esc(n.name)}<div class="muted">${this.esc(n.username || n.email || "")}</div></div></div></td><td>${this.esc(n.phone)}</td><td>${this.esc(n.address || "—")}</td><td><span class="badge">${this.esc(n.role)}</span></td><td>${n.admin ? "Có" : "Không"}</td><td><div class="btn-row"><button class="icon-btn" data-nv-edit="${n.id}">✎ Sửa</button><button class="icon-btn" data-nv-del="${n.id}">🗑 Xóa</button></div></td></tr>`).join("");
    return this.shell(`
      <div class="toolbar"><p class="muted" style="margin:0">Quản lý nhân viên giúp spa vận hành hiệu quả hơn.</p><button class="btn btn-gold" id="add-nv">Thêm mới</button></div>
      <div class="panel" style="padding:8px 16px"><table><thead><tr><th>Nhân viên</th><th>ĐT</th><th>Địa chỉ</th><th>Chức vụ</th><th>Admin</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    `, "Quản lý nhân viên", "Thêm, sửa, xóa nhân viên và cấp quyền admin");
  },
  bindStaff() {
    $("#add-nv").onclick = () => this.formStaff();
    document.querySelectorAll("[data-nv-edit]").forEach((b) => { b.onclick = () => this.formStaff(b.dataset.nvEdit); });
    document.querySelectorAll("[data-nv-del]").forEach((b) => { b.onclick = () => { if (!confirm("Xóa nhân viên này?")) return; Store.deleteStaff(b.dataset.nvDel); this.toast("Đã xóa nhân viên"); this.render(); }; });
  },
  formStaff(id) {
    const editing = id ? Store.get().staff.find((s) => s.id === id) : null;
    const v = editing || {};
    this.openModal(`
      <h3>${editing ? "Sửa nhân viên" : "Thêm nhân viên mới"}</h3>
      <form id="nv-form" class="form-grid">
        <div><label>Tên</label><input name="name" required value="${this.esc(v.name || "")}"></div>
        <div><label>Email</label><input name="email" type="email" required value="${this.esc(v.email || "")}"></div>
        <div><label>Username (đăng nhập)</label><input name="username" required value="${this.esc(v.username || v.email || "")}"></div>
        <div><label>Mật khẩu</label><input name="password" value="${this.esc(v.password || "123456")}"></div>
        <div><label>Điện thoại</label><input name="phone" required value="${this.esc(v.phone || "")}"></div>
        <div><label>Địa chỉ</label><input name="address" value="${this.esc(v.address || "")}"></div>
        <div><label>Chức vụ</label><select name="role"><option ${v.role === "Kỹ thuật viên tự do" ? "selected" : ""}>Kỹ thuật viên tự do</option><option ${v.role === "Nhân viên" ? "selected" : ""}>Nhân viên</option><option ${v.role === "Sale" ? "selected" : ""}>Sale</option></select></div>
        <div><label>Avatar</label><input name="imageFile" type="file" accept="image/*"></div>
        <div class="full"><label><input type="checkbox" name="admin" ${v.admin ? "checked" : ""}> Cho phép truy cập trang quản trị</label></div>
        <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    $("#nv-form").addEventListener("submit", (e) => {
      e.preventDefault(); const f = e.target;
      const done = (avatar) => {
        const payload = { name: f.name.value, email: f.email.value, username: f.username.value, password: f.password.value, phone: f.phone.value, address: f.address.value, role: f.role.value, avatar: avatar || v.avatar || "", admin: f.admin.checked };
        try { if (editing) { Store.updateStaff(id, payload); this.toast("Đã cập nhật"); } else { Store.addStaff(payload); this.toast("Đã thêm nhân viên"); } this.closeModal(); this.render(); } catch (err) { this.toast(err.message); }
      };
      const file = f.imageFile.files[0];
      if (file) this.readImage(file, done); else done("");
    });
  },

  // HOTDEALS
  viewHotDeals() {
    const d = Store.get();
    const cards = d.hotdeals.map((h) => {
      const sv = Store.getService(h.serviceId);
      const off = h.discountType === "percent" ? `Giảm ${h.discountValue}%` : `Giảm ${Store.money(h.discountValue)}`;
      return `<article class="card product-card"><div class="cover" style="background:linear-gradient(135deg,#b76e79,#c4a574)">${h.image ? `<img src="${h.image}" alt="">` : ""}</div><div class="body"><span class="badge">${off}</span><h4>${this.esc(h.name)}</h4><p class="muted">${this.esc(h.description || "")}</p><div class="muted">${this.esc(h.storeName || "Tất cả")} · ${sv ? this.esc(sv.name) : ""}</div><div class="muted">${h.startDate} → ${h.endDate} · ${h.quantity} suất</div><div class="btn-row" style="margin-top:10px"><button class="icon-btn" data-hd-edit="${h.id}">✎ Sửa</button>${this.canDelete() ? `<button class="icon-btn" data-hd-del="${h.id}">🗑 Xóa</button>` : ""}</div></div></article>`;
    }).join("");
    return this.shell(`
      <div class="toolbar"><p class="muted" style="margin:0">HotDeal hiển thị nổi bật trên trang chủ ứng dụng.</p><button class="btn btn-gold" id="add-deal">Thêm mới</button></div>
      <div class="grid-cards">${cards || `<p class="muted">Chưa có chương trình.</p>`}</div>
    `, "Quản lý HotDeal", "Tạo, sửa, xóa chương trình ưu đãi");
  },
  bindHotDeals() {
    $("#add-deal").onclick = () => this.formHotDeal();
    document.querySelectorAll("[data-hd-edit]").forEach((b) => { b.onclick = () => this.formHotDeal(b.dataset.hdEdit); });
    document.querySelectorAll("[data-hd-del]").forEach((b) => { b.onclick = () => { if (!confirm("Xóa HotDeal này?")) return; Store.deleteHotDeal(b.dataset.hdDel); this.toast("Đã xóa HotDeal"); this.render(); }; });
  },
  formHotDeal(id) {
    const editing = id ? Store.get().hotdeals.find((h) => h.id === id) : null;
    const v = editing || {};
    const d = Store.get();
    this.openModal(`
      <h3>${editing ? "Sửa HotDeal" : "Thêm HotDeal"}</h3>
      <form id="hd-form" class="form-grid">
        <div class="full"><label>Tên ưu đãi</label><input name="name" required value="${this.esc(v.name || "")}"></div>
        <div class="full"><label>Mô tả</label><textarea name="description">${this.esc(v.description || "")}</textarea></div>
        <div><label>Cửa hàng</label><select name="storeName"><option value="" ${!v.storeName ? "selected" : ""}>— Tất cả —</option>${d.branches.map((b) => `<option ${v.storeName === b ? "selected" : ""}>${this.esc(b)}</option>`).join("")}</select></div>
        <div><label>Dịch vụ</label><select name="serviceId" required>${d.services.map((s) => `<option value="${s.id}" ${v.serviceId === s.id ? "selected" : ""}>${this.esc(s.name)}</option>`).join("")}</select></div>
        <div><label>Hình ảnh</label><input name="imageFile" type="file" accept="image/*"></div>
        <div><label>Loại giảm</label><select name="discountType"><option value="percent" ${v.discountType === "percent" ? "selected" : ""}>Phần trăm</option><option value="amount" ${v.discountType === "amount" ? "selected" : ""}>Số tiền</option></select></div>
        <div><label>Giá trị giảm</label><input name="discountValue" type="number" min="0" required value="${v.discountValue ?? ""}"></div>
        <div><label>Số lượng</label><input name="quantity" type="number" min="1" value="${v.quantity ?? 50}"></div>
        <div><label>Bắt đầu</label><input name="startDate" type="date" required value="${v.startDate || ""}"></div>
        <div><label>Kết thúc</label><input name="endDate" type="date" required value="${v.endDate || ""}"></div>
        <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu</button><button class="btn btn-ghost" type="button" id="cancel-modal">Hủy</button></div>
      </form>
    `);
    $("#cancel-modal").onclick = () => this.closeModal();
    const form = $("#hd-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const done = (image) => {
        const payload = { name: fd.get("name"), description: fd.get("description"), storeName: fd.get("storeName"), serviceId: fd.get("serviceId"), image: image || v.image || "", discountType: fd.get("discountType"), discountValue: Number(fd.get("discountValue")), quantity: Number(fd.get("quantity")), startDate: fd.get("startDate"), endDate: fd.get("endDate") };
        try { if (editing) { Store.updateHotDeal(id, payload); this.toast("Đã cập nhật"); } else { Store.addHotDeal(payload); this.toast("Đã tạo HotDeal"); } this.closeModal(); this.render(); } catch (err) { this.toast(err.message); }
      };
      const file = form.imageFile.files[0];
      if (file) this.readImage(file, done); else done("");
    });
  },

  // REPORTS
  viewReports() {
    const f = this.reportFilters;
    const list = Store.getReportBookings(f);
    const revenue = list.reduce((s, b) => s + Number(b.revenueRecognized ?? b.total ?? 0), 0);
    const total = list.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const count = list.length;
    const avg = count ? total / count : 0;
    const techList = Store.technicians();
    const branchList = Store.get().branches;
    const dayMap = {};
    list.forEach((b) => {
      const key = (b.at || "").slice(0, 10); if (!key) return;
      if (!dayMap[key]) dayMap[key] = { date: key, count: 0, revenue: 0 };
      dayMap[key].count += 1; dayMap[key].revenue += Number(b.revenueRecognized ?? b.total ?? 0);
    });
    const dayRows = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date)).map((r) => `<tr><td>${r.date}</td><td>${r.count}</td><td>${Store.money(r.revenue)}</td></tr>`).join("");
    const techMap = {};
    list.forEach((b) => {
      if (!b.technician) return;
      if (!techMap[b.technician]) techMap[b.technician] = { name: b.technician, count: 0, revenue: 0 };
      techMap[b.technician].count += 1; techMap[b.technician].revenue += Number(b.revenueRecognized ?? b.total ?? 0);
    });
    const techReportRows = Object.values(techMap).sort((a, b) => b.revenue - a.revenue).map((r) => `<tr><td>${this.esc(r.name)}</td><td>${r.count}</td><td>${Store.money(r.revenue)}</td></tr>`).join("");
    return this.shell(`
      <div class="panel" style="padding:16px;margin-bottom:16px">
        <div class="report-filters">
          <div><label>Từ ngày</label><input type="date" data-rp-filter="from" value="${f.from}"></div>
          <div><label>Đến ngày</label><input type="date" data-rp-filter="to" value="${f.to}"></div>
          <div><label>Chi nhánh</label><select data-rp-filter="branch"><option value="">Tất cả</option>${branchList.map((b) => `<option ${f.branch === b ? "selected" : ""}>${this.esc(b)}</option>`).join("")}</select></div>
          <div><label>Nhân viên</label><select data-rp-filter="staff"><option value="">Tất cả</option>${techList.map((t) => `<option ${f.staff === t.name ? "selected" : ""}>${this.esc(t.name)}</option>`).join("")}</select></div>
          <div style="align-self:end"><button class="btn btn-gold" id="rp-clear">Xóa lọc</button></div>
          <div style="align-self:end"><button class="btn btn-dark" id="rp-export">📥 Xuất CSV</button></div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span>Số đơn hoàn tất</span><strong>${count}</strong></div>
        <div class="kpi"><span>Doanh thu ghi nhận</span><strong>${Store.money(revenue)}</strong></div>
        <div class="kpi"><span>Tổng giá trị dịch vụ</span><strong>${Store.money(total)}</strong></div>
        <div class="kpi"><span>Trung bình / đơn</span><strong>${Store.money(Math.round(avg))}</strong></div>
      </div>
      <div class="split" style="margin-top:16px">
        <div class="panel" style="padding:16px"><h4 style="margin:0 0 12px">Theo ngày</h4><table><thead><tr><th>Ngày</th><th>Số đơn</th><th>Doanh thu</th></tr></thead><tbody>${dayRows || `<tr><td colspan="3" class="muted">Chưa có dữ liệu</td></tr>`}</tbody></table></div>
        <div class="panel" style="padding:16px"><h4 style="margin:0 0 12px">Theo nhân viên</h4><table><thead><tr><th>KTV</th><th>Số đơn</th><th>Doanh thu</th></tr></thead><tbody>${techReportRows || `<tr><td colspan="3" class="muted">Chưa có dữ liệu</td></tr>`}</tbody></table></div>
      </div>
    `, "Báo cáo doanh thu", "Lọc theo khoảng ngày, chi nhánh, nhân viên và xuất CSV");
  },
  bindReports() {
    document.querySelectorAll("[data-rp-filter]").forEach((inp) => { inp.addEventListener("change", () => { this.reportFilters[inp.dataset.rpFilter] = inp.value; this.render(); }); });
    $("#rp-clear").onclick = () => { this.reportFilters = { from: "", to: "", branch: "", staff: "" }; this.render(); };
    $("#rp-export").onclick = () => {
      const list = Store.getReportBookings(this.reportFilters);
      if (!list.length) { this.toast("Không có dữ liệu để xuất"); return; }
      const header = ["Mã", "Thời gian", "Khách", "SĐT", "Chi nhánh", "Hạng mục", "KTV", "Thanh toán", "Tổng", "Doanh thu ghi nhận", "Trạng thái"];
      const rows = list.map((b) => [b.id, (b.at || "").replace("T", " "), b.customerName, b.phone, b.branch || "", b.item, b.technician || "", b.payMethod || "", b.total || 0, b.revenueRecognized ?? b.total ?? 0, b.status]);
      const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `bao-cao-${this.todayISO()}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      this.toast("Đã xuất CSV");
    };
  },

  // ═══ CUSTOMER VIEWS ═══
  khServiceCard(s) {
    const unit = Store.serviceUnit(s);
    return `<article class="card product-card" data-book-service="${s.id}" style="cursor:pointer"><div class="cover">${s.image ? `<img src="${s.image}" alt="">` : ""}</div><div class="body"><span class="badge">${this.esc(s.category)}</span><h4>${this.esc(s.name)}</h4><div class="muted">${s.duration} phút</div><div style="margin-top:8px"><span class="price">${Store.money(unit)}</span>${s.promoPrice ? `<span class="muted" style="text-decoration:line-through;margin-left:8px">${Store.money(s.price)}</span>` : ""}</div><button class="btn btn-gold" style="width:100%;margin-top:10px">Đặt lịch</button></div></article>`;
  },
  khCardProduct(c) {
    const isSession = c.cardType === "session";
    const sessions = Number(c.sessions || 0) + Number(c.bonusSessions || 0);
    return `<article class="card product-card"><div class="cover">${c.image ? `<img src="${c.image}" alt="">` : ""}</div><div class="body">${isSession ? `<span class="badge badge-session">${sessions} buổi</span>` : ""}<h4>${this.esc(c.name)}</h4><div class="muted">${this.esc(c.partner)} · ${c.duration} phút</div><div style="margin-top:8px"><span class="price">${Store.money(c.promoPrice || c.price)}</span>${c.promoPrice ? `<span class="muted" style="text-decoration:line-through;margin-left:8px">${Store.money(c.price)}</span>` : ""}</div><div class="muted">${isSession ? `Gói ${sessions} buổi` : `Tặng thêm ${Store.money(c.bonus)}`} · ${Store.expiryLabel(c)}</div><div class="muted" style="margin-top:8px">📞 Liên hệ spa để mua thẻ</div></div></article>`;
  },
  viewKHHome() {
    const user = this.currentUser();
    const customer = Store.get().customers.find((c) => c.id === user.id);
    const myCards = customer?.cards || [];
    const totalBalance = myCards.filter((c) => c.cardType !== "session").reduce((s, c) => s + (c.balance || 0), 0);
    const totalSessions = myCards.filter((c) => c.cardType === "session").reduce((s, c) => s + (c.sessions || 0), 0);
    const activeDeals = Store.getActiveHotDeals();
    const dealsHtml = activeDeals.map((h) => {
      const sv = Store.getService(h.serviceId);
      const off = h.discountType === "percent" ? `-${h.discountValue}%` : `-${Store.money(h.discountValue)}`;
      return `<div class="kh-hotdeal-card"><div class="kh-hotdeal-cover">${h.image ? `<img src="${h.image}" alt="">` : ""}</div><div class="kh-hotdeal-body"><span class="badge">${off}</span><h4>${this.esc(h.name)}</h4><div class="muted">${this.esc(sv?.name || "")} · ${this.esc(h.storeName || "Tất cả chi nhánh")}</div></div></div>`;
    }).join("");
    const featuredServices = Store.get().services.filter((s) => s.online).slice(0, 4);
    const servicesHtml = featuredServices.map((s) => this.khServiceCard(s)).join("");
    const cardsOnSale = Store.get().valueCards.filter((c) => c.online).slice(0, 4);
    const cardsHtml = cardsOnSale.map((c) => this.khCardProduct(c)).join("");
    const upcoming = Store.get().bookings.filter((b) => b.customerId === user.id && ["Chờ xác nhận", "Đã xác nhận", "Đang làm"].includes(b.status)).slice(0, 3);
    const upcomingHtml = upcoming.length ? `<div class="panel" style="padding:18px;margin-top:18px"><h4 style="margin:0 0 12px">📅 Lịch hẹn sắp tới</h4>${upcoming.map((b) => `<div class="warn-row"><div><strong>${this.esc(b.item)}</strong><div class="muted">${(b.at || "").replace("T", " ")} · ${this.esc(b.branch || "")}</div></div><div>${this.statusBadge(b.status)}</div></div>`).join("")}</div>` : "";
    return this.shell(`
      <div class="hero"><div><h3>Xin chào, ${this.esc(user.name)} 👋</h3><p>Khám phá dịch vụ và ưu đãi hấp dẫn tại iSpa. Đặt lịch và theo dõi thẻ giá trị ngay tại đây.</p></div><div class="btn-row" style="align-self:end"><button class="btn btn-gold" data-go="kh-book">Đặt lịch ngay</button><button class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.25)" data-go="kh-cards">Thẻ của tôi</button></div></div>
      ${myCards.length ? `<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><span>Tổng số dư thẻ</span><strong>${Store.money(totalBalance)}</strong></div><div class="kpi"><span>Số buổi còn lại</span><strong>${totalSessions} buổi</strong></div><div class="kpi"><span>Số thẻ sở hữu</span><strong>${myCards.length}</strong></div></div>` : ""}
      ${upcomingHtml}
      ${dealsHtml ? `<div class="panel" style="padding:18px;margin-top:18px"><h4 style="margin:0 0 12px">🔥 Ưu đãi HotDeal</h4><div class="kh-hotdeal-grid">${dealsHtml}</div></div>` : ""}
      <div class="panel" style="padding:18px;margin-top:18px"><div class="toolbar" style="margin:0 0 12px"><h4 style="margin:0">◈ Dịch vụ nổi bật</h4><button class="btn btn-ghost" data-go="kh-services">Xem tất cả</button></div><div class="grid-cards">${servicesHtml || `<p class="muted">Chưa có dịch vụ.</p>`}</div></div>
      ${cardsOnSale.length ? `<div class="panel" style="padding:18px;margin-top:18px"><h4 style="margin:0 0 12px">💳 Thẻ giá trị đang bán</h4><div class="grid-cards">${cardsHtml}</div></div>` : ""}
    `, "Trang chủ", "Chào mừng bạn đến với iSpa");
  },
  bindKHHome() {
    document.querySelectorAll("[data-book-service]").forEach((el) => { el.onclick = () => { this.khBookPreset = el.dataset.bookService; this.go("kh-book"); }; });
  },
  viewKHServices() {
    const tab = this.khServiceTab || "services";
    const services = Store.get().services.filter((s) => s.online);
    const cards = Store.get().valueCards.filter((c) => c.online);
    const servicesHtml = services.map((s) => this.khServiceCard(s)).join("");
    const cardsHtml = cards.map((c) => this.khCardProduct(c)).join("");
    return this.shell(`
      <div class="tabs"><button class="tab ${tab === "services" ? "active" : ""}" data-kh-tab="services">Dịch vụ</button><button class="tab ${tab === "cards" ? "active" : ""}" data-kh-tab="cards">Thẻ giá trị</button></div>
      <div ${tab === "services" ? "" : "hidden"}><div class="grid-cards">${servicesHtml || `<p class="muted">Chưa có dịch vụ.</p>`}</div></div>
      <div ${tab === "cards" ? "" : "hidden"}><div class="grid-cards">${cardsHtml || `<p class="muted">Chưa có thẻ.</p>`}</div></div>
    `, "Dịch vụ & Thẻ giá trị", "Chọn dịch vụ để đặt lịch");
  },
  bindKHServices() {
    document.querySelectorAll("[data-kh-tab]").forEach((t) => { t.onclick = () => { this.khServiceTab = t.dataset.khTab; this.render(); }; });
    document.querySelectorAll("[data-book-service]").forEach((el) => { el.onclick = () => { this.khBookPreset = el.dataset.bookService; this.go("kh-book"); }; });
  },
  viewKHBook() {
    const user = this.currentUser();
    const preset = this.khBookPreset || "";
    const services = Store.get().services.filter((s) => s.online);
    const branches = Store.get().branches;
    return this.shell(`
      <div class="panel" style="padding:24px;max-width:760px">
        <h3 style="margin:0 0 16px;font-family:'Cormorant Garamond',serif;font-size:26px">Đặt lịch dịch vụ</h3>
        <form id="kh-book-form" class="form-grid">
          <div class="full"><label>Dịch vụ</label><select name="serviceId" required><option value="">— Chọn dịch vụ —</option>${services.map((s) => `<option value="${s.id}" ${s.id === preset ? "selected" : ""}>${this.esc(s.name)} · ${Store.money(Store.serviceUnit(s))}</option>`).join("")}</select></div>
          <div><label>Số lượng</label><input name="qty" type="number" min="1" value="1" required></div>
          <div><label>Chi nhánh</label><select name="branch">${branches.map((b) => `<option>${this.esc(b)}</option>`).join("")}</select></div>
          <div class="full"><label>Thời gian mong muốn</label><input name="at" type="datetime-local" value="${this.nowLocal()}" required></div>
          <div class="full"><label>Kỹ thuật viên (nếu có)</label><select name="technician">${this.techOptions()}</select></div>
          <div class="full" style="background:#f5efe1;padding:14px;border-radius:12px;font-size:13px">📞 Spa sẽ gọi xác nhận lịch hẹn qua SĐT <strong>${this.esc(user.phone)}</strong>. Thanh toán tại spa khi đến.</div>
          <div class="full btn-row"><button class="btn btn-gold" type="submit">Xác nhận đặt lịch</button><button class="btn btn-ghost" type="button" data-go="kh-home">Hủy</button></div>
        </form>
      </div>
    `, "Đặt lịch", "Chọn dịch vụ và thời gian phù hợp");
  },
  bindKHBook() {
    $("#kh-book-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const user = this.currentUser();
      try {
        Store.customerBookService({ customerId: user.id, serviceId: f.serviceId.value, qty: Number(f.qty.value), at: f.at.value, technician: f.technician.value, branch: f.branch.value });
        this.toast("Đã đặt lịch! Spa sẽ liên hệ xác nhận"); this.go("kh-orders");
      } catch (err) { this.toast(err.message); }
    });
  },
  viewKHCards() {
    const user = this.currentUser();
    const c = Store.get().customers.find((x) => x.id === user.id);
    const cards = (c?.cards || []).map((card) => {
      const expired = Store.isCardExpired(card); const isSession = card.cardType === "session";
      const hist = card.history.map((h) => `<div class="item"><strong>${this.esc(h.note)}</strong><span class="muted">${h.at.replace("T", " ")} · ${h.amount ? (h.amount > 0 ? "+" : "") + Store.money(h.amount) + " · " : ""}còn ${Store.money(h.balanceAfter)}${isSession && h.sessionsAfter !== undefined ? ` · ${h.sessionsAfter} buổi` : ""}</span></div>`).join("");
      const balanceText = isSession ? `${card.sessions} buổi` : Store.money(card.balance);
      const originalText = isSession ? `${card.originalSessions} buổi` : Store.money(card.original);
      return `<div class="panel" style="padding:16px;margin-bottom:12px"><div class="toolbar"><div><h4 style="margin:0">${this.esc(card.name)} ${expired ? `<span class="status-badge st-cancelled">Hết hạn</span>` : ""}</h4><div class="muted">Hạn: ${card.expiryDate || card.expiry} · Gốc ${originalText}</div></div><div class="price">${balanceText}</div></div><button class="btn btn-ghost hist-toggle" data-card="${card.id}">Lịch sử giao dịch</button><div class="timeline history" id="hist-${card.id}" hidden>${hist || `<p class="muted">Chưa có giao dịch</p>`}</div></div>`;
    }).join("");
    return this.shell(`${cards || `<div class="panel" style="padding:32px;text-align:center"><p class="muted">Bạn chưa có thẻ giá trị nào.</p><button class="btn btn-gold" data-go="kh-services" style="margin-top:12px">Xem thẻ đang bán</button></div>`}`, "Thẻ của tôi", "Xem số dư và lịch sử giao dịch");
  },
  bindKHCards() {
    document.querySelectorAll(".hist-toggle").forEach((b) => b.addEventListener("click", () => { const box = $(`#hist-${b.dataset.card}`); box.hidden = !box.hidden; }));
  },
  viewKHOrders() {
    const user = this.currentUser();
    const bookings = Store.get().bookings.filter((b) => b.customerId === user.id || b.phone === user.phone);
    const rows = bookings.map((b) => `<tr><td>${(b.at || "").replace("T", " ")}</td><td>${this.esc(b.item)}</td><td>${this.esc(b.technician || "—")}</td><td>${Store.money(b.total)}</td><td>${this.statusBadge(b.status)}</td><td>${b.status === "Chờ xác nhận" ? `<button class="icon-btn" data-cancel="${b.id}">Hủy</button>` : ""}</td></tr>`).join("");
    return this.shell(`
      <div class="toolbar"><span class="muted">${bookings.length} đơn</span><button class="btn btn-gold" data-go="kh-book">Đặt lịch mới</button></div>
      <div class="panel" style="padding:8px 16px"><table><thead><tr><th>Thời gian</th><th>Hạng mục</th><th>KTV</th><th>Tổng</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted" style="text-align:center;padding:32px">Chưa có đơn nào</td></tr>`}</tbody></table></div>
    `, "Đơn của tôi", "Theo dõi trạng thái đặt lịch");
  },
  bindKHOrders() {
    document.querySelectorAll("[data-cancel]").forEach((b) => {
      b.onclick = () => {
        if (!confirm("Hủy đơn này?")) return;
        try { Store.customerCancelBooking(b.dataset.cancel, this.currentUser().id); this.toast("Đã hủy đơn"); this.render(); } catch (err) { this.toast(err.message); }
      };
    });
  },
  viewKHProfile() {
    const user = this.currentUser();
    const c = Store.get().customers.find((x) => x.id === user.id);
    if (!c) return this.shell(`<p class="muted">Không tìm thấy thông tin.</p>`, "Tài khoản", "");
    return this.shell(`
      <div class="panel" style="padding:24px;max-width:760px">
        <div class="hero-person" style="margin-bottom:20px">${this.avatar(c.avatar, c.name, "lg")}<div><h3 style="margin:0">${this.esc(c.name)}</h3><p class="muted">${this.esc(c.phone)}${c.email ? " · " + this.esc(c.email) : ""}</p></div></div>
        <form id="kh-profile-form" class="form-grid">
          <div><label>Họ tên</label><input name="name" required value="${this.esc(c.name)}"></div>
          <div><label>Email</label><input name="email" type="email" value="${this.esc(c.email || "")}"></div>
          <div><label>Sinh nhật</label><input name="birthday" type="date" value="${c.birthday || ""}"></div>
          <div><label>Số điện thoại</label><input value="${this.esc(c.phone)}" readonly style="background:#f5efe1"></div>
          <div class="full"><label>Địa chỉ</label><input name="address" value="${this.esc(c.address || "")}"></div>
          <div class="full"><label>Avatar</label><input name="imageFile" type="file" accept="image/*"></div>
          <div class="full"><label>Mật khẩu mới (để trống nếu không đổi)</label><input name="password" type="password" placeholder="••••••"></div>
          <div class="full btn-row"><button class="btn btn-gold" type="submit">Lưu thay đổi</button></div>
        </form>
      </div>
    `, "Tài khoản", "Cập nhật thông tin cá nhân và mật khẩu");
  },
  bindKHProfile() {
    $("#kh-profile-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target; const user = this.currentUser();
      const done = (avatar) => {
        try {
          const payload = { name: f.name.value, email: f.email.value, address: f.address.value, birthday: f.birthday.value, avatar: avatar || "" };
          if (f.password.value) payload.password = f.password.value;
          Store.customerUpdateProfile(user.id, payload);
          this.toast("Đã cập nhật thông tin"); this.render();
        } catch (err) { this.toast(err.message); }
      };
      const file = f.imageFile.files[0];
      if (file) this.readImage(file, done); else done("");
    });
  },
};

App.init();