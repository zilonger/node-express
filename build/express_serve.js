"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var ws_1 = require("ws");
var app = express();
/*描述产品信息类*/
var Product = (function () {
    function Product(id, title, price, rating, desc, categories) {
        this.id = id;
        this.title = title;
        this.price = price;
        this.rating = rating;
        this.desc = desc;
        this.categories = categories;
    }
    return Product;
}());
exports.Product = Product;
/*描述评论信息的类*/
var Comment = (function () {
    function Comment(id, productId, timestamp, user, rating, comment) {
        this.id = id;
        this.productId = productId;
        this.timestamp = timestamp;
        this.user = user;
        this.rating = rating;
        this.comment = comment;
    }
    return Comment;
}());
exports.Comment = Comment;
var products = [
    new Product(1, '我的商品一', 19.98, 3.8, '这是第一个被创建的商品！', ['angular', 'ts']),
    new Product(2, '我的商品二', 13.38, 4.8, '这是第二个被创建的商品！', ['angularjs']),
    new Product(3, '我的商品三', 9.98, 2.8, '这是第三个被创建的商品！', ['java', 'js框架']),
    new Product(4, '我的商品四', 39.28, 3.5, '这是第四个被创建的商品！', ['js框架']),
    new Product(5, '我的商品五', 29.98, 3.0, '这是第五个被创建的商品！', ['前端开发']),
    new Product(6, '我的商品六', 19.00, 3.2, '这是第六个被创建的商品！', ['js框架']),
    new Product(7, '我的商品七', 19.55, 4.4, '这是第七个被创建的商品！', ['angular', '后端']),
    new Product(8, '我的商品八', 9.9, 2.5, '这是第八个被创建的商品！', ['angular', 'nodejs']),
];
var comments = [
    new Comment(1, 1, '2017-11-7 16:52', '赵龙', 3.5, '还可以哦，不错！'),
    new Comment(2, 1, '2017-11-7 16:52', '赵龙', 2.5, '还可以哦，不错！'),
    new Comment(3, 2, '2017-11-7 16:52', '赵龙', 3.5, '还可以不错！'),
    new Comment(4, 2, '2017-11-7 16:52', '小龙', 3, '还可以哦，不错！'),
    new Comment(5, 3, '2017-11-7 16:52', '赵龙', 3.5, '可以哦，不错！'),
    new Comment(6, 3, '2017-11-7 16:52', '赵龙', 1.5, '还可以哦，不错！'),
];
/*app.get('/', (req, res) => {
    res.send("Hello Express!");
});*/
app.use('/', express.static(path.join(__dirname, '..', 'client')));
app.get('/api/products', function (req, res) {
    //res.send("接收到商品查询请求!!!");
    var result = products;
    var params = req.query;
    //过滤留下 包含搜索名的商品
    if (params.title) {
        result = result.filter(function (pro) { return pro.title.indexOf(params.title) !== -1; });
    }
    //过滤留下 商品价格小于等于搜索价格
    if (params.price && result.length > 0) {
        result = result.filter(function (pro) { return pro.price <= parseInt(params.price); });
    }
    //过滤留下 商品分类 当为-1时全部分类，不过滤
    if (params.category && params.category !== '-1' && result.length > 0) {
        result = result.filter(function (pro) { return pro.categories.indexOf(params.category) !== -1; });
    }
    res.json(result);
});
app.get('/api/product/:id', function (req, res) {
    res.json(products.find(function (product) { return product.id === +req.params.id; }));
});
app.get('/api/product/:id/comments', function (req, res) {
    res.json(comments.filter(function (comment) { return comment.productId === +req.params.id; }));
});
var server = app.listen(8000, "localhost", function () {
    console.log("express服务已启动，地址是 http://localhost:8000 ");
});
/*webSocket服务*/
var subscriptions = new Map();
var wsServer = new ws_1.Server({ port: 8085 });
wsServer.on('connection', function (websocket) {
    /*websocket.send("这条消息是服务器主动推送的！");*/
    /*当有新的websocket连接时，监听到消息后，将接收到商品id,加入到Map中*/
    websocket.on("message", function (message) {
        //console.log("接收到客户端发来的消息："+ message);
        var messageObj = JSON.parse(message);
        var productIds = subscriptions.get(websocket) || [];
        subscriptions.set(websocket, productIds.concat([messageObj.productId]));
    });
});
var currentBids = new Map();
/*定时发送最新报价*/
setInterval(function () {
    /*针对所有商品手动产生最新报价*/
    products.forEach(function (p) {
        var currentBid = currentBids.get(p.id) || p.price;
        /*新出价在现有出价上加上一个随机数*/
        var newBid = currentBid + Math.random() * 5;
        currentBids.set(p.id, newBid);
    });
    subscriptions.forEach(function (productIds, ws) {
        /*判断客户端当前的websocket还存在，则发送消息给客户端*/
        if (ws.readyState === 1) {
            /*map方法，回调函数针对数组的每个元素都执行，将每个元素转化为一个对象*/
            var newBids = productIds.map(function (pid) { return ({
                productId: pid,
                bid: currentBids.get(pid)
            }); });
            /*将当前连接的productIds数组中的每个元素转为一个对象，发送回客户端*/
            ws.send(JSON.stringify(newBids));
        }
        else {
            /*当客户端websocket不存在的情况下，删除该websocket*/
            subscriptions.delete(ws);
        }
    });
}, 2000);
