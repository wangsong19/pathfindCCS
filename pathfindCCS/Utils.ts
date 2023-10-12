import { Mesh, gfx, geometry, Vec3, utils, primitives } from 'cc';
const { MeshUtils } = utils;


export class Utils {
    
    static roundNumber (value, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    static sample (list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    static distanceToSquared (a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dz = a.z - b.z;
    
        return dx * dx + dy * dy + dz * dz;
    }

    static isPointInPoly (poly, pt) {
        for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
          ((poly[i].z <= pt.z && pt.z < poly[j].z) || (poly[j].z <= pt.z && pt.z < poly[i].z)) && (pt.x < (poly[j].x - poly[i].x) * (pt.z - poly[i].z) / (poly[j].z - poly[i].z) + poly[i].x) && (c = !c);
        return c;
    }

    static isVectorInPolygon (vector, polygon, vertices) {
        // reference point will be the centroid of the polygon
        // We need to rotate the vector as well as all the points which the polygon uses
        var lowestPoint = 100000;
        var highestPoint = -100000;
    
        var polygonVertices = [];
    
        polygon.vertexIds.forEach((vId) => {
            lowestPoint = Math.min(vertices[vId].y, lowestPoint);
            highestPoint = Math.max(vertices[vId].y, highestPoint);
            polygonVertices.push(vertices[vId]);
        });
    
        const H = 2; // 高度容差（根据地形复杂度合理设置）
        if (this.isPointInPoly(polygonVertices, vector)) {
        }
        if (vector.y < highestPoint + H && vector.y > lowestPoint - H &&
            this.isPointInPoly(polygonVertices, vector)) {
          return true;
        }
        return false;
    }

    static triarea2 (a, b, c) {
        var ax = b.x - a.x;
        var az = b.z - a.z;
        var bx = c.x - a.x;
        var bz = c.z - a.z;
        return bx * az - ax * bz;
    }

    static vequal (a, b) {
        return this.distanceToSquared(a, b) < 0.00001;
    }

    // 计算平面与点之间的距离
    static distancePlaneToPoint(plane: geometry.Plane, p: Vec3) {
        const plx = plane.x;
        const ply = plane.y;
        const plz = plane.z;
        return Math.abs(plx*p.x + ply*p.y + plz*p.z + plane.d) / Math.sqrt(plx*plx + ply*ply + plz*plz);
    }

    static mergeVertices (mesh: Mesh, tolerance = 1e-4) {

        tolerance = Math.max( tolerance, Number.EPSILON );

        var hashToIndex = {};
        var indices = mesh.readIndices(0) as Uint32Array;
        var positions = mesh.readAttribute(0, gfx.AttributeName.ATTR_POSITION);
        var vertexCount = indices ? indices.length : positions.length;

        var nextIndex = 0;
        var newIndices = [];
        var newPositions = [];
        
        var decimalShift = Math.log10( 1 / tolerance );
        var shiftMultiplier = Math.pow( 10, decimalShift );

        for ( var i = 0; i < vertexCount; i ++ ) {
            // 索引的数据大小是 1
            var index = indices ? indices[i] : i; 
            // 顶点的数据大小是 3
            var x = index * 3 + 0;
            var y = x + 1;
            var z = y + 1;

            var hash = '';
            hash += `${ ~ ~ ( positions[x] * shiftMultiplier ) },`;
            hash += `${ ~ ~ ( positions[y] * shiftMultiplier ) },`;
            hash += `${ ~ ~ ( positions[z] * shiftMultiplier ) },`;

            if ( hash in hashToIndex ) {
                newIndices.push( hashToIndex[hash] );
            } else {
                newPositions.push( positions[x] );
                newPositions.push( positions[y] );
                newPositions.push( positions[z] );
        
                hashToIndex[ hash ] = nextIndex;
                newIndices.push( nextIndex );
                nextIndex ++;
            }
        }

        // Construct merged BufferGeometry.
        const geometry : primitives.IGeometry = {
            positions: newPositions,
            indices: newIndices,
        }

        const result = new Mesh();
        MeshUtils.createMesh(geometry, result);
        return result;
    }

}