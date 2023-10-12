# pathfindCCS
cocos creator3网格导航工具（基于three-pathfinding项目）

### 致谢（Thanks for three-pathfinding）
>感谢[three-pathfinding](https://github.com/donmccurdy/three-pathfinding)项目为我在cocos creator3引擎中能使用网格导航提供解决思路和支持。为了表达对原项目的尊重，本项目仅针对适配creator引擎做了修改，而保留了原项目的所有代码和注释。也希望这份代码能给大家带来帮助！ 

欢迎大家可以访问[three-pathfinding](https://github.com/donmccurdy/three-pathfinding)项目进行代码参考研究！


### 使用（Quickstart）
下载本库,然后添加到cocos creator引擎当中
``` bash
git clone https://github.com/wangsong19/pathfindCCS.git
```

在需要进行寻路的节点所挂在的脚本中引入该库
``` typescript
start() {
    this.fpHelper = new FPHelper(
            this.mainCamera,    // 用于打开几何体渲染器
            this.node,          // 需要寻路的节点
            this.target,        // 追赶的目标
            this.speed,         // 寻路节点的速度
            'models/nevMesh/Navmesh',  // 导航网格glb格式
            'navmesh',          // 加载后的网格层命名
            true                // 是否开启debug显示模式
        ); 

    // 其他初始化数据...
}
```
在该节点的帧处理函数进行更新调用
``` typescript
update(deltaTime: number) {
    // 进行寻路
    this.fpHelper.findByFrame(deltaTime);
}
```


### 效果展示
![gif动图](./demo.gif)


### 相关要点说明

1. 首先需要准备导航网格，导航网格是根据游戏场景的地形生成的。如果是纯2D或地形平面比较简单的可以直接使用`tiled`编辑网格平面导出为json后使用astar算法应该就能解决。如果模型是`blender`制作的那就可以使用`upbge`(基于blender的游戏引擎)。必要时对导航网格进行拓扑优化。

2. 网格推荐导出为glb格式，因为在对本项目进行调试的时候发现fbx格式的与glb格式在用cocos creator加载后顶点信息会有少许的变化

3. 在对`fpHelper`进行实例化的时候指定了`speed`参数，并提供了及时更新节点速度的函数`upadteMySpeed()`,这意味着当这个节点速度发生变化，应该及时通过`upadteMySpeed()`来更新这个节点真实的移动速度。这么处理的原因是`fpHelper`无法通过`me`节点获取其脚本组件所定义的速度，如果有更好的办法，希望得到指点！

4. 这个demo展示了怪物动态寻路追赶玩家的过程，如果刚好你的项目也是这样的情况，那么恭喜你，如果不是，请参考`fpHelper`里的代码自行修改调整（那就不需要`fpHelper`了）

5. 本项目基于`cocos creator3.8`

6. 注意，debug模式需要在`项目设置`的功能裁剪栏开启几何体渲染


### 注意

使用本库应该把导航网格与游戏场景本身的坐标保持一致，尽管可以设置寻路的高度容差（`fpHelper.settoleranceH(h)`），但这并不是一个好主意。同样地，控制玩家（被追赶者）的移动路径应该符合物理属性（即在地面上（尽可能贴合网格））行走，而不是飘在空中，这样会寻路丢失目标。
