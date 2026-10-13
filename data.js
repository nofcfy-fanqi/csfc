// 更新这里即可修改球队、成员与相册。不需要修改页面代码。
// 图片放进 assets/photos/，路径写成 "./assets/photos/文件名.jpg"。
window.CLUB_DATA = {
  team: {
    name: "CSFC",
    tagline: "从第一次传球，到最后一声哨响。\n这里，记录属于我们的足球故事。",
    demo: true, // 换成真实名单后改为 false，隐藏示例资料提示。
  },
  players: [
    { name: "陈一鸣", studentId: "DEMO-001", jerseyName: "CHEN", number: "01", position: "门将", photo: "" },
    { name: "林子航", studentId: "DEMO-002", jerseyName: "LIN", number: "04", position: "后卫", photo: "" },
    { name: "周予安", studentId: "DEMO-003", jerseyName: "ZHOU", number: "05", position: "后卫", photo: "" },
    { name: "王泽宇", studentId: "DEMO-004", jerseyName: "WANG", number: "06", position: "中场", photo: "" },
    { name: "李景行", studentId: "DEMO-005", jerseyName: "LI", number: "08", position: "中场", photo: "" },
    { name: "张予辰", studentId: "DEMO-006", jerseyName: "ZHANG", number: "10", position: "中场", photo: "" },
    { name: "许亦帆", studentId: "DEMO-007", jerseyName: "XU", number: "07", position: "前锋", photo: "" },
    { name: "吴昊然", studentId: "DEMO-008", jerseyName: "WU", number: "09", position: "前锋", photo: "" },
  ],
  // photo 留空时显示照片占位；填写本地路径后即可点击查看大图。
  // category 使用 "合影"、"比赛" 或 "训练"。
  albums: [
    { title: "我们的第一张全家福", category: "合影", photo: "", description: "留一个位置，给每一位队友。", placeholder: "TEAM TOGETHER" },
    { title: "属于足球的夜晚", category: "比赛", photo: "./assets/stadium.jpg", description: "球场氛围示例照片，来自 Unsplash；并非 CSFC 比赛记录。", sample: true },
    { title: "下一次，一起上场", category: "训练", photo: "", description: "日常训练的汗水，也值得被记录。", placeholder: "BACK TO THE PITCH" },
  ],
};
