import { Camera, Vec3, resources, Mesh, gfx, Color, Node } from 'cc';

import { Pathfinding } from './Pathfinding'
import { Utils } from './Utils';


/**
 * （use cocos creator3）
 * 作为怪物追寻玩家的情况的辅助类（自动寻路）
 * 如果是其他情况可以以此进行参考
 *  1. 寻路网格初始化
 *  2. 每帧寻路位置更新
 *  3. debug显示寻路网格（！注意，需要在项目设置的功能裁剪栏开启几何体渲染）
 */
export class FPHelper {
    
    // debug camera
    private debugMode: boolean = false;
    private mainCamera: Camera = null!;
    private debugVetexces = [];

    private me: Node = null!;
    private speed: number = 2;
    private target: Node = null!;

    // nav mesh / path finder info
    private zoneName = 'NavMesh';
    private pathfinder: Pathfinding = null!;

    // naigation info
    private path = [];
    private isNavigating: boolean = false;
    private targetLastPosition: Vec3 = null!;

    private reCalDistance: number = 0.5; // 单位 1
    private minCloseDistance: number = 0.05 * 0.05;
    private minNoNavDistance: number = 0.1; // must be > minCloseDistance

    /**
     * 需要提供必要更新数据
     * @param mc        主相机
     * @param me        我
     * @param target    目标
     * @param speed     我的速度
     * @param gldPath   导航网格资源所在路径
     * @param zoneName  可以缺省
     */
    constructor (
        mc :Camera, 
        me: Node, 
        target: Node, 
        speed: number,
        gldPath: string, 
        zoneName: string = 'NavMesh',
        debug: boolean = false
        ) {
            this.mainCamera = mc;
            this.me = me;
            this.target = target;
            this.speed = speed;
            this.zoneName = zoneName;
            this.debugMode = debug;

            resources.load(gldPath, Mesh, (err, mesh) => {
                if (err) {
                    console.error("PathFinderCCS: load navmesh failed.", err);
                    return;
                }

                const pathfinder = new Pathfinding();
                pathfinder.setZoneData(zoneName, Pathfinding.createZone(mesh));
                
                this.pathfinder = pathfinder;
                this.isNavigating = true;
                this.targetLastPosition = this.target.worldPosition;

                if (debug) this._setDebugInfo(mesh);
            })
    }


    /**
     * 设置debug显示信息
     * @param mesh 
     */
    _setDebugInfo (mesh: Mesh) {
        const indices = mesh.readIndices(0) as Uint32Array;
        const positions = mesh.readAttribute(0, gfx.AttributeName.ATTR_POSITION);
        
        let newPositions = new Float32Array(indices.length * 3);
        for (let i = 0; i < indices.length; i++) {
            const index = indices[i];
            for (let k = 0; k < 3; k++) {
                newPositions[i * 3 + k] = positions[index * 3 + k];
            }
            this.debugVetexces.push(new Vec3(newPositions[i * 3], newPositions[i * 3 + 1], newPositions[i * 3 + 2]));
        }

        this.mainCamera?.camera?.initGeometryRenderer();
    }

    /**
     * 每帧需要被调用函数
     * @param deltaTime 
     */
    findByFrame (deltaTime: number) {
        // show mesh wireframe 
        if (this.debugMode) {
            this.mainCamera?.camera?.geometryRenderer?.addMesh(new Vec3(0,0,0), this.debugVetexces, Color.GRAY);
            
            // show path point and line
            if (this.path) {
                const pLen = this.path.length; 
                const myWPos = this.me.worldPosition;
                for (let i = 0; i < pLen; i++) {
                    // point
                    this.mainCamera?.camera?.geometryRenderer?.addCross(this.path[i], 5, Color.YELLOW);
                    // line
                    if (i == 0) {
                        this.mainCamera?.camera?.geometryRenderer?.addLine(myWPos, this.path[i], Color.BLUE);
                    }
                    if (i != pLen-1) {
                        this.mainCamera?.camera?.geometryRenderer?.addLine(this.path[i], this.path[i+1], Color.BLUE);
                    }
                }
            }
        }

        /**
         * 寻路
         * 0. 计算初始寻路路径
         * 1. 在目标还在一定范围内的时候将不会更新path
         * 2. 向路径最近的点移动，靠近时剔除最近点
         */

        const myPos = this.me.worldPosition;
        const targetPos = this.target.worldPosition;

        let hasPath = (this.path || []).length;

        if (!this.target || !this.me
            || !this.isNavigating
            || (targetPos.clone().subtract(myPos).length() <= this.minNoNavDistance))
            {
                if (hasPath) this.path.length = 0;
                return;
            }

        if (!hasPath 
            || this.targetLastPosition.clone().subtract(targetPos).length() > this.reCalDistance)
            {
                const groupID = this.pathfinder.getGroup(this.zoneName, targetPos);
                const path = this.pathfinder.findPath(myPos, targetPos, this.zoneName, groupID);
                if (path == null) {
                    // this.me.setRotationFromEuler(new Vec3(0, -95, 0));
                    const movePos = myPos.add(this.me.forward.normalize().multiplyScalar(deltaTime * this.speed));
                    this.me.setWorldPosition(movePos);
                    
                    hasPath = 0;
                }

                this.path = path;
                this.targetLastPosition = targetPos.clone();
            }

        if (!hasPath) return
        
        const currentPosition = myPos;
        const nextPosition = this.path[0];
        let velocity = nextPosition.clone().subtract(myPos);
        
        if (velocity.lengthSqr() > this.minCloseDistance) { 
            velocity.normalize();
            velocity.multiplyScalar(deltaTime * this.speed);
            currentPosition.add(velocity);

            this.me.lookAt(nextPosition);
            this.me.setWorldPosition(currentPosition);
        } else {
            this.path.shift();
            // 当趋近于目标，但是path路径终点还没到目标时, *可以容忍
            // if (!this.path.length 
            //     && currentPosition.subtract(this.target.worldPosition).length() > this.minCloseDistance) {
            //     this.path.push(this.target.worldPosition);
            // }
        }
    }

    /**
     * ！更新当前速度！（当me节点速度发生变换，务必要更新）
     * 因为不是直接绑定在节点上的组件，所以需要及时更新
     */
     upadteMySpeed (speed: number) {
        this.speed = speed;
    }

    /**
     * 设置地形的高度容差范围
     */
    settoleranceH (h: number) {
        Utils.setH(h);
    }

    /**
     * 设置需要重新寻路的距离条件
     * （当目标位置移动多少后会重新规划路线）
     */
    setReCalDistance (distance: number) {
        if (distance < 0) return;
        this.reCalDistance = distance;
    }

    /**
     * 设置接近目标的最近距离
     * （可以考虑使用插值法）
     */
    setMinCloseDistance (distance: number) {
        if (distance < 0) return;
        this.minCloseDistance = distance;
    }

    /**
     * 设置到达目标后不再需要进行导航的距离
     * （临近目标的位置距离就不再寻路）
     */
    setMinNoNavDistance (distance: number) {
        if (distance < 0) return;
        this.minNoNavDistance = distance;
    }
}