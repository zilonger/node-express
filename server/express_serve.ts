import * as express from 'express';
import * as path from 'path';
import {Server} from "ws";

const app = express();

/*描述产品信息类*/
export class Product {
    constructor(
        public id: number,
        public title: String,
        public price: number,
        public rating: number,
        public desc: String,
        public categories: Array<string>
    ) {}
}

/*描述评论信息的类*/
export class Comment {
    constructor(
        public id: number,
        public productId: number,
        public timestamp: string,
        public user: string,
        public rating: number,
        public comment: string
    ) {}
}
const products: Product[] = [
    new Product(1, '我的商品一', 19.98, 3.8, '这是第一个被创建的商品！', ['angular', 'ts']),
    new Product(2, '我的商品二', 13.38, 4.8, '这是第二个被创建的商品！', ['angularjs']),
    new Product(3, '我的商品三', 9.98, 2.8, '这是第三个被创建的商品！', ['java', 'js框架']),
    new Product(4, '我的商品四', 39.28, 3.5, '这是第四个被创建的商品！', ['js框架']),
    new Product(5, '我的商品五', 29.98, 3.0, '这是第五个被创建的商品！', ['前端开发']),
    new Product(6, '我的商品六', 19.00, 3.2, '这是第六个被创建的商品！', ['js框架']),
    new Product(7, '我的商品七', 19.55, 4.4, '这是第七个被创建的商品！', ['angular', '后端']),
    new Product(8, '我的商品八', 9.9, 2.5, '这是第八个被创建的商品！', ['angular', 'nodejs']),
];
const comments: Comment[] = [
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

app.get('/api/products', (req, res) => {
    //res.send("接收到商品查询请求!!!");
    let result = products;
    let params = req.query;

    //过滤留下 包含搜索名的商品
    if (params.title) {
        result = result.filter((pro) => pro.title.indexOf(params.title) !== -1);
    }
    //过滤留下 商品价格小于等于搜索价格
    if (params.price && result.length > 0) {
        result = result.filter((pro) => pro.price <= parseInt(params.price));
    }
    //过滤留下 商品分类 当为-1时全部分类，不过滤
    if (params.category && params.category !== '-1' && result.length > 0) {
        result = result.filter((pro) => pro.categories.indexOf(params.category) !== -1);
    }

    res.json(result);
});
app.get('/api/product/:id', (req, res) => {
    res.json(products.find((product) => product.id === +req.params.id));
});
app.get('/api/product/:id/comments', (req, res) => {
    res.json(comments.filter((comment: Comment) => comment.productId === +req.params.id));
});

const server = app.listen(8000, "localhost", () => {
    console.log("express服务已启动，地址是 http://localhost:8000 ");
});
/*webSocket服务*/
const subscriptions = new Map<any, number[]>();

const wsServer = new Server({port: 8085});

wsServer.on('connection', websocket => {
    /*websocket.send("这条消息是服务器主动推送的！");*/
    /*当有新的websocket连接时，监听到消息后，将接收到商品id,加入到Map中*/
    websocket.on("message", message => {
        //console.log("接收到客户端发来的消息："+ message);
        let messageObj = JSON.parse(<string>message);
        let productIds = subscriptions.get(websocket) || [];
        subscriptions.set(websocket, [...productIds, messageObj.productId]);
    })
});

const currentBids = new Map<number, number>();
/*定时发送最新报价*/
setInterval(() => {
    /*针对所有商品手动产生最新报价*/
    products.forEach(p => {
        let currentBid = currentBids.get(p.id) || p.price;
        /*新出价在现有出价上加上一个随机数*/
        let newBid = currentBid + Math.random() * 5;
        currentBids.set(p.id, newBid);
    });

    subscriptions.forEach((productIds: number[], ws) => {
        /*判断客户端当前的websocket还存在，则发送消息给客户端*/
        if (ws.readyState === 1) {
            /*map方法，回调函数针对数组的每个元素都执行，将每个元素转化为一个对象*/
            let newBids = productIds.map(pid => ({
                productId: pid,
                bid: currentBids.get(pid)
            }));
            /*将当前连接的productIds数组中的每个元素转为一个对象，发送回客户端*/
            ws.send(JSON.stringify(newBids));
        } else {
            /*当客户端websocket不存在的情况下，删除该websocket*/
            subscriptions.delete(ws);
        }

    })
}, 2000);