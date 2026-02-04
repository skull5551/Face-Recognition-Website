// 1. 定义全局变量（类比C的全局变量）
let model, webcam, ctx, labelContainer, maxPredictions;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const openCameraBtn = document.getElementById('openCamera');
const signBtn = document.getElementById('signBtn');
const exportBtn = document.getElementById('exportBtn');
const result = document.getElementById('result');
const record = document.getElementById('record');
// 签到记录数组（类比C的结构体数组）
let signRecords = JSON.parse(localStorage.getItem('signRecords')) || [];

// ✅ 【唯一需要你修改的地方】：模型路径，默认和HTML同目录，不用改，除非你换了文件夹
const MODEL_URL = "./model.json";

// 初始化：加载模型+显示签到记录
async function init() {
    const modelURL = MODEL_URL;
    const metadataURL = "./metadata.json";
    // 加载Teachable Machine训练的模型（谷歌现成代码）
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    // 显示已有的签到记录
    renderRecords();
    result.innerHTML = "模型加载完成，点击开启摄像头准备签到";
}

// 2. 开启摄像头（核心API，固定写法）
openCameraBtn.onclick = async function() {
    const constraints = { video: true };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();
        result.innerHTML = "摄像头开启成功，点击【签到识别】完成签到";
    } catch (err) {
        result.innerHTML = "摄像头开启失败！请检查是否授权+有无摄像头";
        console.error(err);
    }
};

// 3. 核心：签到识别逻辑（人脸检测+签到记录）
signBtn.onclick = async function() {
    if (!video.srcObject) {
        result.innerHTML = "请先开启摄像头！";
        return;
    }
    // 获取摄像头画面，绘制到本地画布（隐私核心：只在本地处理，不上传）
    ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // 调用模型识别画面中的人脸
    const prediction = await model.predict(canvas);
    // 遍历识别结果，找置信度最高的标签
    let maxConfidence = 0;
    let predictName = "未识别人员";
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].probability.toFixed(2);
        if (classPrediction > maxConfidence) {
            maxConfidence = classPrediction;
            predictName = prediction[i].className;
        }
    }
    // ✅ 识别成功判定：置信度≥0.85（85%），避免误识别
    if (maxConfidence >= 0.85 && predictName !== "未识别人员") {
        const now = new Date().toLocaleString(); // 签到时间
        // 判断是否重复签到
        const isRepeat = signRecords.some(item => item.name === predictName);
        if (isRepeat) {
            result.innerHTML = `✅ ${predictName}，你已签到过啦！签到时间：${now}`;
        } else {
            // 签到成功，添加记录到本地存储
            signRecords.push({ name: predictName, time: now });
            localStorage.setItem('signRecords', JSON.stringify(signRecords));
            result.innerHTML = `🎉 签到成功！姓名：${predictName}，时间：${now}，匹配度：${maxConfidence*100}%`;
            renderRecords(); // 更新展示的签到记录
        }
    } else {
        result.innerHTML = `❌ 未识别/匹配度不足！当前匹配：${predictName}，匹配度：${maxConfidence*100}%`;
    }
};

// 4. 导出签到记录（CSV格式，可直接用Excel打开，纯本地下载，隐私保护）
exportBtn.onclick = function() {
    if (signRecords.length === 0) {
        result.innerHTML = "暂无签到记录可导出！";
        return;
    }
    // 转CSV格式
    let csv = "姓名,签到时间\n";
    signRecords.forEach(item => { csv += `${item.name},${item.time}\n`; });
    // 创建下载链接，浏览器本地下载
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "南大-人脸签到记录.csv";
    a.click();
    result.innerHTML = "✅ 签到记录导出成功！已下载到本地";
};

// 辅助函数：渲染签到记录到页面
function renderRecords() {
    record.innerHTML = "<h3>签到名单（共" + signRecords.length + "人）</h3>";
    signRecords.forEach((item, index) => {
        record.innerHTML += `${index+1}. ${item.name} - ${item.time}<br>`;
    });
}

// 页面加载完成后自动初始化模型
window.onload = init;