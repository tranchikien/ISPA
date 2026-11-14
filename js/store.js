const Store = (() => {
  const KEY = "ispa-pro-v2";
  const SESSION_KEY = "ispa-session";
  const BOOKING_STATUSES = ["Chờ xác nhận", "Đã xác nhận", "Đang làm", "Hoàn tất", "Đã hủy"];

  const seed = () => ({
    branches: ["iSpa Quận 1", "iSpa Quận 3", "iSpa Thủ Đức"],
    categories: ["Thẻ giá trị", "Chăm sóc da", "Massage & Body", "Gội đầu dưỡng sinh"],
    staff: [
      { id: "nv1", name: "Trần Minh Anh", username: "anh.tran@ispa.vn", email: "anh.tran@ispa.vn", password: "123456", phone: "0911111111", avatar: "", address: "iSpa Quận 1", role: "Kỹ thuật viên tự do", admin: false },
      { id: "nv2", name: "Lê Ngọc Hà", username: "ha.le@ispa.vn", email: "ha.le@ispa.vn", password: "123456", phone: "0922222222", avatar: "", address: "iSpa Quận 3", role: "Kỹ thuật viên tự do", admin: false },
      { id: "nv3", name: "Phạm Quốc Huy", username: "admin", email: "huy.pham@ispa.vn", password: "123456", phone: "0933333333", avatar: "", address: "iSpa Thủ Đức", role: "Sale", admin: true },
    ],
    services: [
      { id: "sv1", name: "Gội đầu dưỡng sinh", duration: 60, price: 250000, promoPrice: 0, category: "Gội đầu dưỡng sinh", description: "Gội đầu dưỡng sinh giúp thư giãn.", image: "", commission: 10, online: true },
      { id: "sv2", name: "Massage body thư giãn", duration: 90, price: 450000, promoPrice: 0, category: "Massage & Body", description: "Massage toàn thân.", image: "", commission: 12, online: true },
      { id: "sv3", name: "Chăm sóc da mặt cơ bản", duration: 75, price: 380000, promoPrice: 0, category: "Chăm sóc da", description: "Làm sạch và dưỡng ẩm da mặt.", image: "", commission: 10, online: false },
      { id: "sv4", name: "Chăm sóc da chuyên sâu", duration: 90, price: 650000, promoPrice: 0, category: "Chăm sóc da", description: "Liệu trình chuyên sâu phục hồi da.", image: "", commission: 15, online: true },
    ],
    valueCards: [
      { id: "vc1", cardType: "money", partner: "iSpa Quận 1", name: "VIP 1", category: "Thẻ giá trị", duration: 60, price: 1000000, promoPrice: 900000, bonus: 100000, sessions: 0, bonusSessions: 0, expiryType: "duration", expiryValue: "365", description: "Thẻ giá trị VIP 1.", image: "", commission: 8, online: true },
      { id: "vc2", cardType: "session", partner: "iSpa Quận 1", name: "Gói 10 buổi massage", category: "Thẻ giá trị", duration: 90, price: 3500000, promoPrice: 0, bonus: 0, sessions: 10, bonusSessions: 2, expiryType: "duration", expiryValue: "180", description: "10 buổi massage + tặng 2 buổi.", image: "", commission: 8, online: true },
    ],
    customers: [
      {
        id: "kh1", name: "Nguyễn Thị Lan", phone: "0901234567", password: "123456",
        email: "lan.nguyen@email.com", avatar: "", address: "Quận 1, TP.HCM", birthday: "1990-11-20",
        cards: [
          { id: "own1", templateId: "vc1", cardType: "money", name: "VIP 1", balance: 1000000, original: 1000000, sessions: 0, originalSessions: 0, expiry: "Vô thời hạn", expiryDate: null,
            history: [{ id: "h0", at: "2026-11-01T09:00:00", type: "mua", note: "Mua thẻ VIP 1", amount: 1000000, balanceAfter: 1000000 }] },
        ],
      },
    ],
    bookings: [
      { id: "bk1", type: "sale", customerId: "kh1", customerName: "Nguyễn Thị Lan", phone: "0901234567", at: "2026-11-01T09:00", item: "Thẻ giá trị VIP 1", technician: "", payMethod: "Tiền mặt", total: 900000, revenueRecognized: 900000, status: "Hoàn tất", branch: "iSpa Quận 1" },
    ],
    hotdeals: [
      { id: "hd1", name: "Gội đầu thư giãn tại iSpa chỉ 99K", description: "Trải nghiệm dịch vụ gội đầu dưỡng sinh.", storeName: "iSpa Quận 1", serviceId: "sv1", image: "", discountType: "amount", discountValue: 151000, quantity: 50, startDate: "2026-11-01", endDate: "2026-12-31" },
    ],
  });

  const load = () => {
    const s = seed();
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem("ispa-pro-v1");
      if (!raw) return s;
      const parsed = JSON.parse(raw);
      const staff = parsed.staff || (parsed.technicians || []).map((t, i) => ({ id: t.id || "nv" + (i + 1), name: t.name, email: "", phone: "", avatar: "", address: "", role: "Kỹ thuật viên tự do", admin: false })) || s.staff;
      return {
        ...s, ...parsed,
        categories: parsed.categories?.length ? parsed.categories : s.categories,
        staff: (staff.length ? staff : s.staff).map((n) => ({ password: "123456", username: n.email || n.phone || "user" + n.id, ...n })),
        services: (parsed.services || s.services).map((sv) => ({ promoPrice: 0, description: "", image: "", commission: 0, online: false, ...sv })),
        valueCards: (parsed.valueCards || s.valueCards).map((c) => ({ cardType: "money", sessions: 0, bonusSessions: 0, description: "", image: "", commission: 0, online: false, ...c })),
        customers: (parsed.customers || s.customers).map((c) => ({
          email: "", avatar: "", address: "", birthday: null, cards: [], password: "123456", ...c,
          cards: (c.cards || []).map((card) => {
            const tpl = (parsed.valueCards || s.valueCards || []).find((v) => v.id === card.templateId);
            const cardType = card.cardType || tpl?.cardType || "money";
            return { cardType, sessions: card.sessions ?? 0, originalSessions: card.originalSessions ?? card.sessions ?? 0, expiryDate: null, history: [], ...card };
          }),
        })),
        bookings: (parsed.bookings || s.bookings).map((b) => {
          let status = b.status;
          if (status === "Đã thanh toán") status = "Hoàn tất";
          if (status === "Đã lưu") status = "Chờ xác nhận";
          return { ...b, status: status || "Hoàn tất", revenueRecognized: b.revenueRecognized ?? (status === "Hoàn tất" ? b.total : 0), branch: b.branch || "" };
        }),
        hotdeals: parsed.hotdeals || s.hotdeals,
      };
    } catch { return s; }
  };

  let data = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const uid = (p) => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const money = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
  const technicians = () => data.staff.filter((s) => s.role === "Kỹ thuật viên tự do" || s.role === "Nhân viên");
  const findCustomerByPhone = (phone) => data.customers.find((c) => c.phone.replace(/\s/g, "") === String(phone || "").replace(/\s/g, ""));
  const getService = (id) => data.services.find((s) => s.id === id);
  const getCardTemplate = (id) => data.valueCards.find((c) => c.id === id);
  const serviceUnit = (sv) => Number(sv.promoPrice || sv.price || 0);
  const cardValue = (tpl) => Number(tpl.promoPrice || tpl.price || 0) + Number(tpl.bonus || 0);

  const expiryLabel = (card) => {
    if (card.expiryType === "unlimited") return "Vô thời hạn";
    if (card.expiryType === "date") return card.expiryValue || "Ngày cụ thể";
    if (card.expiryType === "duration") return `${card.expiryValue || 30} ngày kể từ ngày mua`;
    return "—";
  };

  const computeExpiryDate = (tpl, fromDate = new Date()) => {
    if (tpl.expiryType === "unlimited") return null;
    if (tpl.expiryType === "date") return tpl.expiryValue || null;
    if (tpl.expiryType === "duration") {
      const d = new Date(fromDate);
      d.setDate(d.getDate() + Number(tpl.expiryValue || 30));
      return d.toISOString().slice(0, 10);
    }
    return null;
  };

  const isCardExpired = (card) => {
    if (!card?.expiryDate) return false;
    return new Date(card.expiryDate + "T23:59:59") < new Date();
  };

  const calcLines = (lines) => (lines || []).map((ln) => {
      const sv = getService(ln.serviceId);
      const qty = Math.max(1, Number(ln.qty || 1));
      const unit = sv ? serviceUnit(sv) : 0;
      return { serviceId: ln.serviceId, name: sv ? sv.name : "Dịch vụ", qty, unit, amount: unit * qty };
  });

  const applyDiscount = (subtotal, discountType, discountValue) => {
    const val = Number(discountValue || 0);
    let discount = 0;
    if (discountType === "percent") discount = Math.round((subtotal * val) / 100);
    else if (discountType === "amount") discount = val;
    discount = Math.min(subtotal, Math.max(0, discount));
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  };

  // ─── AUTH ───────────────────────────────────
  const login = (username, password) => {
    const staff = data.staff.find((s) => (s.username === username || s.email === username || s.phone === username) && s.password === password);
    if (staff) {
      const session = { id: staff.id, name: staff.name, role: staff.role, admin: !!staff.admin, avatar: staff.avatar, phone: staff.phone, address: staff.address, type: "staff" };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
    const phoneKey = String(username || "").replace(/\s/g, "");
    const customer = data.customers.find((c) => c.phone.replace(/\s/g, "") === phoneKey && (c.password || "123456") === password);
    if (customer) {
      const session = { id: customer.id, name: customer.name, role: "Khách hàng", admin: false, avatar: customer.avatar, phone: customer.phone, type: "customer" };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
    return null;
  };

  const currentUser = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
  const logout = () => localStorage.removeItem(SESSION_KEY);
  
  const refreshSession = () => {
    const s = currentUser();
    if (!s) return;
    if (s.type === "customer") {
      const c = data.customers.find((x) => x.id === s.id);
      if (c) { s.name = c.name; s.avatar = c.avatar; s.phone = c.phone; localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    }
  };

  // ─── CATEGORIES ─────────────────────────────
  const addCategory = (name) => {
    const n = String(name || "").trim();
    if (!n) throw new Error("Nhập tên danh mục");
    if (data.categories.some((c) => c.toLowerCase() === n.toLowerCase())) throw new Error("Danh mục đã tồn tại");
    data.categories.push(n); save(); return n;
  };
  const updateCategory = (oldName, newName) => {
    if (oldName === "Thẻ giá trị") throw new Error("Không thể đổi tên danh mục hệ thống");
    const n = String(newName || "").trim();
    if (!n) throw new Error("Nhập tên danh mục");
    if (oldName === n) return n;
    if (data.categories.some((c) => c.toLowerCase() === n.toLowerCase())) throw new Error("Danh mục đã tồn tại");
    const i = data.categories.indexOf(oldName);
    if (i === -1) throw new Error("Không tìm thấy danh mục");
    data.categories[i] = n;
    data.services.forEach((s) => { if (s.category === oldName) s.category = n; });
    data.valueCards.forEach((c) => { if (c.category === oldName) c.category = n; });
    save(); return n;
  };
  const deleteCategory = (name) => {
    if (name === "Thẻ giá trị") throw new Error("Không thể xóa danh mục hệ thống");
    const used = data.services.filter((s) => s.category === name).length;
    if (used > 0) throw new Error(`Danh mục đang có ${used} dịch vụ`);
    data.categories = data.categories.filter((c) => c !== name); save();
  };

  // ─── SERVICES ───────────────────────────────
  const addService = (p) => { const sv = { id: uid("sv"), ...p }; data.services.unshift(sv); save(); return sv; };
  const updateService = (id, p) => { const sv = data.services.find((s) => s.id === id); if (!sv) throw new Error("Không tìm thấy dịch vụ"); Object.assign(sv, p); save(); return sv; };
  const deleteService = (id) => { data.services = data.services.filter((s) => s.id !== id); save(); };

  // ─── VALUE CARDS ────────────────────────────
  const addValueCard = (p) => { const c = { id: uid("vc"), ...p }; data.valueCards.unshift(c); save(); return c; };
  const updateValueCard = (id, p) => { const c = data.valueCards.find((x) => x.id === id); if (!c) throw new Error("Không tìm thấy thẻ"); Object.assign(c, p); save(); return c; };
  const deleteValueCard = (id) => { data.valueCards = data.valueCards.filter((c) => c.id !== id); save(); };

  // ─── STAFF ──────────────────────────────────
  const addStaff = (p) => { const nv = { id: uid("nv"), ...p }; data.staff.unshift(nv); save(); return nv; };
  const updateStaff = (id, p) => { const nv = data.staff.find((s) => s.id === id); if (!nv) throw new Error("Không tìm thấy nhân viên"); Object.assign(nv, p); save(); return nv; };
  const deleteStaff = (id) => { data.staff = data.staff.filter((s) => s.id !== id); save(); };

  // ─── CUSTOMERS ──────────────────────────────
  const addCustomer = (p) => {
    if (findCustomerByPhone(p.phone)) throw new Error("Số điện thoại đã có trong hệ thống");
    const c = { id: uid("kh"), name: p.name, phone: p.phone, password: p.password || "123456", email: p.email || "", avatar: p.avatar || "", address: p.address || "", birthday: p.birthday || null, cards: [] };
    data.customers.unshift(c); save(); return c;
  };
  const updateCustomer = (id, p) => {
    const c = data.customers.find((x) => x.id === id);
    if (!c) throw new Error("Không tìm thấy khách hàng");
    if (p.phone) {
      const dup = data.customers.find((x) => x.id !== id && x.phone.replace(/\s/g, "") === p.phone.replace(/\s/g, ""));
      if (dup) throw new Error("Số điện thoại đã được dùng cho khách khác");
    }
    Object.assign(c, p); save(); refreshSession(); return c;
  };
  const deleteCustomer = (id) => {
    const c = data.customers.find((x) => x.id === id);
    if (!c) return;
    data.customers = data.customers.filter((x) => x.id !== id);
    data.bookings = data.bookings.filter((b) => b.customerId !== id && b.phone !== c.phone);
    save();
  };

  // ─── HOTDEALS ───────────────────────────────
  const addHotDeal = (p) => { const d = { id: uid("hd"), ...p }; data.hotdeals.unshift(d); save(); return d; };
  const updateHotDeal = (id, p) => { const h = data.hotdeals.find((x) => x.id === id); if (!h) throw new Error("Không tìm thấy HotDeal"); Object.assign(h, p); save(); return h; };
  const deleteHotDeal = (id) => { data.hotdeals = data.hotdeals.filter((h) => h.id !== id); save(); };

  const ensureCustomer = ({ name, phone, email, address, avatar, birthday }) => {
    let c = findCustomerByPhone(phone);
    if (c) {
      if (name) c.name = name;
      if (email) c.email = email;
      if (address) c.address = address;
      if (avatar) c.avatar = avatar;
      if (birthday) c.birthday = birthday;
      save(); return c;
    }
    return addCustomer({ name: name || "Khách mới", phone, email, address, avatar, birthday });
  };

  // ─── BOOKING LIFECYCLE ──────────────────────
  const refundBooking = (b, reason) => {
    if (!b.ownedCardId) return;
    const c = data.customers.find((x) => x.id === b.customerId);
    if (!c) return;
    const owned = c.cards.find((cd) => cd.id === b.ownedCardId);
    if (!owned) return;
    if (b.sessionUsed) {
      owned.sessions = (owned.sessions || 0) + b.sessionUsed;
      owned.history.unshift({ id: uid("h"), at: new Date().toISOString().slice(0, 16), type: "hoan", note: reason + ` (+${b.sessionUsed} buổi)`, amount: 0, balanceAfter: owned.balance, sessionsAfter: owned.sessions });
      return;
    }
    const amount = Number(b.cardAmount ?? b.total ?? 0);
    if (amount <= 0) return;
    owned.balance += amount;
    owned.history.unshift({ id: uid("h"), at: new Date().toISOString().slice(0, 16), type: "hoan", note: reason, amount, balanceAfter: owned.balance });
  };

  const updateBookingStatus = (id, status) => {
    const b = data.bookings.find((x) => x.id === id);
    if (!b) throw new Error("Không tìm thấy đơn");
    if (!BOOKING_STATUSES.includes(status)) throw new Error("Trạng thái không hợp lệ");
    if (status === "Đã hủy" && b.status !== "Đã hủy") refundBooking(b, `Hoàn tiền hủy đơn ${b.id}`);
    if (status === "Hoàn tất" && b.status !== "Hoàn tất") b.revenueRecognized = b.revenueRecognized ?? b.total ?? 0;
    if (status === "Đã hủy") b.revenueRecognized = 0;
    b.status = status; save(); return b;
  };

  const updateBooking = (id, p) => { const b = data.bookings.find((x) => x.id === id); if (!b) throw new Error("Không tìm thấy đơn"); Object.assign(b, p); save(); return b; };
  const deleteBooking = (id) => {
    const b = data.bookings.find((x) => x.id === id);
    if (!b) return;
    if (b.status !== "Đã hủy") refundBooking(b, `Hoàn tiền xóa đơn ${b.id}`);
    data.bookings = data.bookings.filter((x) => x.id !== id); save();
  };

  // ─── SALE / PAY / ORDER ─────────────────────
  const sellValueCard = ({ phone, name, at, templateId, technician, payMethod, branch }) => {
    const tpl = getCardTemplate(templateId);
    if (!tpl) throw new Error("Không tìm thấy thẻ giá trị");
    const customer = ensureCustomer({ phone, name });
    const expiryDate = computeExpiryDate(tpl, new Date(at || Date.now()));
    const isSession = tpl.cardType === "session";
    const cardType = isSession ? "session" : "money";
    const balance = isSession ? 0 : cardValue(tpl);
    const sessions = isSession ? Number(tpl.sessions || 0) + Number(tpl.bonusSessions || 0) : 0;
    const owned = {
      id: uid("own"), templateId: tpl.id, cardType, name: tpl.name, balance, original: balance, sessions, originalSessions: sessions, expiry: expiryLabel(tpl), expiryDate,
      history: [{ id: uid("h"), at, type: "mua", note: isSession ? `Mua thẻ ${tpl.name} (${sessions} buổi)` : `Mua thẻ ${tpl.name}`, amount: isSession ? 0 : balance, balanceAfter: balance, sessionsAfter: sessions }],
    };
    customer.cards.unshift(owned);
    const booking = {
      id: uid("bk"), type: "sale", customerId: customer.id, customerName: customer.name, phone: customer.phone,
      at, item: `Thẻ giá trị ${tpl.name}`, technician: technician || "", payMethod: payMethod || "Tiền mặt",
      total: Number(tpl.promoPrice || tpl.price), revenueRecognized: Number(tpl.promoPrice || tpl.price),
      status: "Hoàn tất", ownedCardId: owned.id, branch: branch || tpl.partner || "",
    };
    data.bookings.unshift(booking); save();
    return { customer, booking, owned };
  };

  const payWithCard = ({ phone, name, at, serviceId, qty, technician, ownedCardId, discountType, discountValue, cardAmount, remainderMethod, branch }) => {
    const customer = findCustomerByPhone(phone);
    if (!customer) throw new Error("Khách hàng chưa có trong hệ thống");
    const lines = calcLines([{ serviceId, qty }]);
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const { discount, total } = applyDiscount(subtotal, discountType, discountValue);
    const owned = customer.cards.find((c) => c.id === ownedCardId);
    if (!owned) throw new Error("Chưa chọn thẻ giá trị");
    if (isCardExpired(owned)) throw new Error(`Thẻ "${owned.name}" đã hết hạn (${owned.expiryDate})`);
    const item = lines.map((l) => `${l.name} x${l.qty}`).join(", ");
    if (owned.cardType === "session") {
      if ((owned.sessions || 0) <= 0) throw new Error("Thẻ đã hết buổi");
      owned.sessions -= 1;
      owned.history.unshift({ id: uid("h"), at, type: "thanh-toan", note: `Sử dụng 1 buổi — ${item}`, amount: 0, balanceAfter: owned.balance, sessionsAfter: owned.sessions, technician: technician || "" });
      const booking = {
        id: uid("bk"), type: "service", customerId: customer.id, customerName: customer.name, phone: customer.phone,
        at, item, lines, technician: technician || "", payMethod: `Thẻ ${owned.name} (1 buổi)`,
        subtotal, discount, total: 0, revenueRecognized: 0, sessionUsed: 1, status: "Hoàn tất", ownedCardId: owned.id, branch: branch || "",
      };
      data.bookings.unshift(booking); save();
      return { customer, booking, owned, service: getService(serviceId) };
    }
    let useCard = Number(cardAmount ?? owned.balance);
    if (!Number.isFinite(useCard) || useCard < 0) useCard = 0;
    if (useCard > owned.balance) useCard = owned.balance;
    if (useCard > total) useCard = total;
    const remainder = total - useCard;
    if (remainder > 0 && !remainderMethod) throw new Error("Vui lòng chọn phương thức thanh toán phần còn lại");
    owned.balance -= useCard;
    owned.history.unshift({ id: uid("h"), at, type: "thanh-toan", note: `Thanh toán ${item} (trừ ${money(useCard)})`, amount: -useCard, balanceAfter: owned.balance, technician: technician || "" });
    const payMethod = remainder > 0 ? `Thẻ ${owned.name} + ${remainderMethod}` : `Thẻ ${owned.name}`;
    const booking = {
      id: uid("bk"), type: "service", customerId: customer.id, customerName: customer.name, phone: customer.phone,
      at, item, lines, technician: technician || "", payMethod, subtotal, discount, total, cardAmount: useCard, remainderAmount: remainder, remainderMethod: remainder > 0 ? remainderMethod : "",
      revenueRecognized: remainder, status: "Hoàn tất", ownedCardId: owned.id, branch: branch || "",
    };
    data.bookings.unshift(booking); save();
    return { customer, booking, owned, service: getService(serviceId) };
  };

  const createOrder = ({ phone, name, at, lines, technician, discountType, discountValue, payMethod, paid, branch }) => {
    if (!phone) throw new Error("Nhập số điện thoại");
    if (!name) throw new Error("Nhập tên khách hàng nếu là khách mới");
    const parsed = calcLines(lines.filter((l) => l.serviceId));
    if (!parsed.length) throw new Error("Chọn dịch vụ");
    const customer = ensureCustomer({ phone, name });
    const subtotal = parsed.reduce((s, l) => s + l.amount, 0);
    const { discount, total } = applyDiscount(subtotal, discountType, discountValue);
    const item = parsed.map((l) => `${l.name} x${l.qty}`).join(", ");
    const booking = {
      id: uid("bk"), type: "order", customerId: customer.id, customerName: customer.name, phone: customer.phone,
      at, item, lines: parsed, technician: technician || "", payMethod: payMethod || "Tiền mặt",
      discountType: discountType || "none", discountValue: Number(discountValue || 0), subtotal, discount, total, revenueRecognized: paid ? total : 0,
      status: paid ? "Hoàn tất" : "Chờ xác nhận", branch: branch || "",
    };
    data.bookings.unshift(booking); save();
    return { customer, booking };
  };

  const saveDraft = (booking) => { data.bookings.unshift({ id: uid("bk"), status: "Chờ xác nhận", revenueRecognized: 0, ...booking }); save(); };
  const reset = () => { data = seed(); save(); };

  const getExpiringCards = (days = 30) => {
    const result = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); limit.setDate(limit.getDate() + days);
    data.customers.forEach((c) => {
      (c.cards || []).forEach((card) => {
        if (!card.expiryDate) return;
        const exp = new Date(card.expiryDate + "T23:59:59");
        const daysLeft = Math.ceil((exp - today) / 86400000);
        if (exp < today) result.push({ customer: c, card, status: "expired", daysLeft });
        else if (exp < limit) result.push({ customer: c, card, status: "soon", daysLeft });
      });
    });
    return result;
  };

  const getBirthdaysThisMonth = () => {
    const month = new Date().getMonth() + 1;
    return data.customers.filter((c) => {
      if (!c.birthday) return false;
      const parts = c.birthday.split("-");
      return Number(parts[1]) === month;
    });
  };

  const getReportBookings = ({ from, to, branch, staff }) => {
    let list = data.bookings.filter((b) => b.status === "Hoàn tất");
    if (from) list = list.filter((b) => (b.at || "").slice(0, 10) >= from);
    if (to) list = list.filter((b) => (b.at || "").slice(0, 10) <= to);
    if (branch) list = list.filter((b) => b.branch === branch);
    if (staff) list = list.filter((b) => b.technician === staff);
    return list;
  };

  const getActiveHotDeals = () => {
    const today = new Date().toISOString().slice(0, 10);
    return data.hotdeals.filter((h) => (!h.startDate || h.startDate <= today) && (!h.endDate || h.endDate >= today));
  };

  const customerBookService = ({ customerId, serviceId, qty, at, technician, branch }) => {
    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error("Không tìm thấy khách hàng");
    const sv = getService(serviceId);
    if (!sv) throw new Error("Dịch vụ không tồn tại");
    const qtyN = Math.max(1, Number(qty || 1));
    const unit = serviceUnit(sv);
    const subtotal = unit * qtyN;
    const item = `${sv.name} x${qtyN}`;
    const booking = {
      id: uid("bk"), type: "order", customerId: customer.id, customerName: customer.name, phone: customer.phone,
      at, item, lines: [{ serviceId, name: sv.name, qty: qtyN, unit, amount: subtotal }],
      technician: technician || "", payMethod: "Thanh toán tại spa", subtotal, discount: 0, total: subtotal, revenueRecognized: 0,
      status: "Chờ xác nhận", branch: branch || "",
    };
    data.bookings.unshift(booking); save();
    return { customer, booking };
  };

  const customerCancelBooking = (bookingId, customerId) => {
    const b = data.bookings.find((x) => x.id === bookingId && x.customerId === customerId);
    if (!b) throw new Error("Không tìm thấy đơn");
    if (b.status !== "Chờ xác nhận") throw new Error("Chỉ có thể hủy đơn đang chờ xác nhận");
    b.status = "Đã hủy"; save();
    return b;
  };

  const customerUpdateProfile = (customerId, payload) => {
    const c = data.customers.find((x) => x.id === customerId);
    if (!c) throw new Error("Không tìm thấy khách hàng");
    if (payload.phone) {
      const dup = data.customers.find((x) => x.id !== customerId && x.phone.replace(/\s/g, "") === payload.phone.replace(/\s/g, ""));
      if (dup) throw new Error("Số điện thoại đã được dùng cho khách khác");
    }
    if (payload.password) c.password = payload.password;
    const { password, ...rest } = payload;
    Object.assign(c, rest); save(); refreshSession();
    return c;
  };

  return {
    get: () => data, save, uid, money, technicians, findCustomerByPhone, getService, getCardTemplate,
    serviceUnit, expiryLabel, cardValue, calcLines, applyDiscount, computeExpiryDate, isCardExpired, BOOKING_STATUSES,
    login, currentUser, logout, refreshSession,
    addCategory, updateCategory, deleteCategory, addService, updateService, deleteService,
    addValueCard, updateValueCard, deleteValueCard, addStaff, updateStaff, deleteStaff,
    addCustomer, updateCustomer, deleteCustomer, ensureCustomer, addHotDeal, updateHotDeal, deleteHotDeal,
    updateBookingStatus, updateBooking, deleteBooking, sellValueCard, payWithCard, createOrder, saveDraft, reset,
    getExpiringCards, getBirthdaysThisMonth, getReportBookings, getActiveHotDeals, customerBookService, customerCancelBooking, customerUpdateProfile,
  };
})();