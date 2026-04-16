const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const menu2File = 'menu2.json';
const app = express();
app.use(cors());
const path = require('path');
//app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(__dirname));
app.use(express.json());


const uploadPath = path.join(__dirname, 'uploads');

// ✅ Create folder safely
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

//const PORT = 3000;

// STORAGE CONFIG
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath); // ✅ use full path
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// LOAD DATA
function readData() {
    if (!fs.existsSync('data.json')) {
        fs.writeFileSync('data.json', '[]');
    }
    return JSON.parse(fs.readFileSync('data.json'));
}
// SAVE DATA
function saveData(data) {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// 📥 GET MENU
app.get('/menu', (req, res) => {
    res.json(readData());
});

// ➕ ADD ITEM WITH IMAGE
app.post('/add', upload.single('image'), (req, res) => {
    const data = readData();

    const newItem = {
        id: Date.now(),
        name: req.body.name,
        desc: req.body.desc,
        price: req.body.price,
        img: req.file.filename
    };

    data.push(newItem);
    saveData(data);

    res.json({ message: "Item added!" });
});

// ❌ DELETE ITEM + IMAGE
app.delete('/delete/:id', (req, res) => {
    let data = readData();

    const item = data.find(i => i.id == req.params.id);

   if (item && item.img && fs.existsSync(`uploads/${item.img}`)) {
    fs.unlinkSync(`uploads/${item.img}`);
}

    data = data.filter(i => i.id != req.params.id);
    saveData(data);

    res.json({ message: "Deleted!" });
});

// ✏️ UPDATE ITEM (optional)
app.put('/update/:id', upload.single('image'), (req, res) => {
    let data = readData();

    const index = data.findIndex(i => i.id == req.params.id);

    if (index !== -1) {
        let old = data[index];

        // delete old image if new uploaded
        if (req.file) {
            fs.unlinkSync(`uploads/${old.img}`);
            old.img = req.file.filename;
        }

        old.name = req.body.name;
        old.desc = req.body.desc;
        old.price = req.body.price;

        data[index] = old;
        saveData(data);
    }

    res.json({ message: "Updated!" });
});


function readMenu2() {
    if(!fs.existsSync(menu2File)) fs.writeFileSync(menu2File, '[]');
    return JSON.parse(fs.readFileSync(menu2File));
}

function saveMenu2(data) {
    fs.writeFileSync(menu2File, JSON.stringify(data, null, 2));
}

// Get Menu2
app.get('/menu2', (req,res)=>{
    res.json(readMenu2());
});

// Add Menu2 item
app.post('/menu2/add', express.json(), (req,res)=>{
    const data = readMenu2();
    const newItem = {
        id: Date.now(),
        name: req.body.name,
        price: parseFloat(req.body.price),
        type: req.body.type
    };
    data.push(newItem);
    saveMenu2(data);
    res.json({ message: "Menu2 item added!" });
});

// Delete Menu2 item
app.delete('/menu2/delete/:id',(req,res)=>{
    let data = readMenu2();
    data = data.filter(i=>i.id != req.params.id);
    saveMenu2(data);
    res.json({ message: "Deleted!" });
});

// ================= SALES SYSTEM ================= //

const salesFile = 'sales.json';

// Ensure file exists
if (!fs.existsSync(salesFile)) {
    fs.writeFileSync(salesFile, JSON.stringify([]));
}

// Read sales
function readSales() {
    if (!fs.existsSync(salesFile)) {
        fs.writeFileSync(salesFile, '[]');
    }
    return JSON.parse(fs.readFileSync(salesFile));
}

// Save sales
function saveSales(data) {
    fs.writeFileSync(salesFile, JSON.stringify(data, null, 2));
}

// 🧾 GET ALL SALES
app.get('/sales', (req, res) => {
    res.json(readSales());
});

// ➕ ADD SALE (IMPORTANT)
app.post('/sales', (req, res) => {
    const sales = readSales();

    const billNo = getNextBillNo(); // 🔥 auto number

    const order = {
        billNo: billNo,
        time: req.body.time,
        customer: req.body.customer,
        items: req.body.items,
        total: req.body.total
    };

    sales.push(order);
    saveSales(sales);

    res.json({ message: "Saved", billNo: billNo });
});

// 📅 TODAY SALES
app.get('/sales/today', (req, res) => {
    const sales = readSales();

    const today = new Date();

    const filtered = sales.filter(s => {
        const d = new Date(s.time);

        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    });

    res.json(filtered);
});

// ❌ CLEAR SALES
app.delete('/sales', (req, res) => {
    saveSales([]);
    res.json({ message: "All sales cleared" });
});

app.get('/sales/top', (req, res) => {
    const sales = readSales();
    let count = {};

    sales.forEach(order => {
        const items = order.items.split(", ");
        items.forEach(i => {
            count[i] = (count[i] || 0) + 1;
        });
    });

    res.json(count);
});
app.get('/sales/total', (req, res) => {
    const sales = readSales();
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    res.json({ total });
});

app.get('/sales/month', (req, res) => {
    const sales = readSales();
    const month = new Date().getMonth();

    const filtered = sales.filter(s => {
        return new Date(s.time).getMonth() === month;
    });

    res.json(filtered);
});

const counterFile = 'counter.json';

function getNextBillNo() {
    if (!fs.existsSync(counterFile)) {
        fs.writeFileSync(counterFile, JSON.stringify({
            date: new Date().toLocaleDateString(),
            bill: 1
        }));
    }

    let data = JSON.parse(fs.readFileSync(counterFile));
    const today = new Date().toLocaleDateString();

    // 🔥 Reset if new day
    if (data.date !== today) {
        data = { date: today, bill: 1 };
    }

    const billNo = data.bill;

    data.bill += 1;
    fs.writeFileSync(counterFile, JSON.stringify(data));

    return billNo;
}


//refresh page
//const http = require('http').createServer(app);
//const io = require('socket.io')(http);
//const express = require('express');
//const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static(__dirname)); // serve HTML

// 👉 Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/reports.html');
});

// 👉 Dummy data (replace with DB later)
let sales = [];

// 👉 Get today's sales
app.get('/sales/today', (req, res) => {
  res.json(sales);
});
app.post('/new-order', (req, res) => {
  const order = {
    time: new Date().toLocaleString(),
    customer: req.body.customer || "Guest",
    items: req.body.items || "",
    total: parseFloat(req.body.total) || 0
  };

  sales.push(order);

  // 🔥 Trigger real-time update
  io.emit('ordersUpdate');

  res.json({ message: "Order added ✅" });
});

io.on('connection', (socket) => {
  console.log("User connected ✅");
});

// 👉 Start server
const PORT = process.env.PORT || 3000;

http.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
