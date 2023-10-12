import { Vec3, geometry, Mesh } from 'cc';
const Plane = geometry.Plane


import { Utils } from './Utils';
import { AStar } from './AStar';
import { Builder } from './Builder';
import { Channel } from './Channel';


export class Pathfinding {
    
    zones = null;

    constructor () {
        this.zones = {};
    }

    // (Static) Builds a zone/node set from navigation mesh geometry.
    static createZone (geometry: Mesh, tolerance = 1e-4) {
		return Builder.buildZone(geometry, tolerance);
	}

    // Sets data for the given zone.
    setZoneData (zoneID, zone) {
		this.zones[zoneID] = zone;
	}

    // Returns a random node within a given range of a given position.
    getRandomNode (zoneID, groupID, nearPosition, nearRange) {

		if (!this.zones[zoneID]) return new Vec3();

		nearPosition = nearPosition || null;
		nearRange = nearRange || 0;

		const candidates = [];
		const polygons = this.zones[zoneID].groups[groupID];

		polygons.forEach((p) => {
			if (nearPosition && nearRange) {
				if (Utils.distanceToSquared(nearPosition, p.centroid) < nearRange * nearRange) {
					candidates.push(p.centroid);
				}
			} else {
				candidates.push(p.centroid);
			}
		});

		return Utils.sample(candidates) || new Vec3();
	}

    // Returns the closest node to the target position.
    getClosestNode (position, zoneID, groupID, checkPolygon = false) {
		const nodes = this.zones[zoneID].groups[groupID];
		const vertices = this.zones[zoneID].vertices;
		let closestNode = null;
		let closestDistance = Infinity;

		nodes.forEach((node) => {
			const distance = Utils.distanceToSquared(node.centroid, position);
			if (distance < closestDistance
					&& (!checkPolygon || Utils.isVectorInPolygon(position, node, vertices))) {
				closestNode = node;
				closestDistance = distance;
			}
		});

		return closestNode;
	}

    // Returns a path between given start and end points. If a complete path
    // cannot be found, will return the nearest endpoint available.
    findPath (startPosition, targetPosition, zoneID, groupID) {
		const nodes = this.zones[zoneID].groups[groupID];
		const vertices = this.zones[zoneID].vertices;

		const closestNode = this.getClosestNode(startPosition, zoneID, groupID, true);
		const farthestNode = this.getClosestNode(targetPosition, zoneID, groupID, true);
		
		// If we can't find any node, just go straight to the target
		if (!closestNode || !farthestNode) {
			return null;
		}

		const paths = AStar.search(nodes, closestNode, farthestNode);

		const getPortalFromTo = function (a, b) {
			for (var i = 0; i < a.neighbours.length; i++) {
				if (a.neighbours[i] === b.id) {
					return a.portals[i];
				}
			}
		};

		// We have the corridor, now pull the rope.
		const channel = new Channel();
		channel.push(startPosition);
		for (let i = 0; i < paths.length; i++) {
			const polygon = paths[i];
			const nextPolygon = paths[i + 1];

			if (nextPolygon) {
				const portals = getPortalFromTo(polygon, nextPolygon);
				channel.push(
					vertices[portals[0]],
					vertices[portals[1]]
				);
			}
		}
		channel.push(targetPosition);
		channel.stringPull();

		// Return the path, omitting first position (which is already known).
		const path = channel.path.map((c) => new Vec3(c.x, c.y, c.z));
		path.shift();
		return path;
	}

    // Returns closest node group ID for given position.
    getGroup (zoneID, position, checkPolygon = false) {
        let plane = new Plane();
        if (!this.zones[zoneID]) return null;

		let closestNodeGroup = null;
		let distance = Math.pow(50, 2);
		const zone = this.zones[zoneID];

		for (let i = 0; i < zone.groups.length; i++) {
			const group = zone.groups[i];
			for (const node of group) {
				if (checkPolygon) {
					Plane.fromPoints(
                        plane,
						zone.vertices[node.vertexIds[0]],
						zone.vertices[node.vertexIds[1]],
						zone.vertices[node.vertexIds[2]]
					);
                    if (Math.abs(Utils.distancePlaneToPoint(plane, position)) < 0.01) {
					// if (Math.abs(plane.distanceToPoint(position)) < 0.01) {
						const poly = [
							zone.vertices[node.vertexIds[0]],
							zone.vertices[node.vertexIds[1]],
							zone.vertices[node.vertexIds[2]]
						];
						if(Utils.isPointInPoly(poly, position)) {
							return i;
						}
					}
				}
				const measuredDistance = Utils.distanceToSquared(node.centroid, position);
				if (measuredDistance < distance) {
					closestNodeGroup = i;
					distance = measuredDistance;
				}
			}
		}

		return closestNodeGroup;
    }
}