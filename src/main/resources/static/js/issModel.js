import * as THREE from "three";

export function createIssModel() {
    const group = new THREE.Group();
    const animatedArrays = [];

    const materials = {
        white: new THREE.MeshStandardMaterial({
            color: 0xdde5ed,
            metalness: 0.62,
            roughness: 0.38
        }),
        silver: new THREE.MeshStandardMaterial({
            color: 0x8fa5b9,
            metalness: 0.8,
            roughness: 0.3
        }),
        dark: new THREE.MeshStandardMaterial({
            color: 0x263746,
            metalness: 0.56,
            roughness: 0.4
        }),
        gold: new THREE.MeshStandardMaterial({
            color: 0xb68a45,
            metalness: 0.65,
            roughness: 0.38
        }),
        solar: new THREE.MeshStandardMaterial({
            color: 0x365379,
            metalness: 0.3,
            roughness: 0.52,
            side: THREE.DoubleSide
        }),
        solarGrid: new THREE.LineBasicMaterial({
            color: 0xb9a076,
            transparent: true,
            opacity: 0.65
        }),
        light: new THREE.MeshBasicMaterial({
            color: 0xff4545
        })
    };

    function box(width, height, depth, material, position, parent = group) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        mesh.position.set(...position);
        parent.add(mesh);

        return mesh;
    }

    function cylinder(radius, length, material, position, rotation = [0, 0, 0]) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                16
            ),
            material
        );

        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        group.add(mesh);

        return mesh;
    }

    function rod(start, end, radius = 0.0015, material = materials.silver) {
        const from = new THREE.Vector3(...start);
        const to = new THREE.Vector3(...end);
        const direction = to.clone().sub(from);

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                direction.length(),
                8
            ),
            material
        );

        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        group.add(mesh);
        return mesh;
    }

    function createTruss() {
        box(0.315, 0.004, 0.004, materials.silver, [0, 0, 0]);

        for (const y of [-0.007, 0.007]) {
            rod([-0.157, y, 0], [0.157, y, 0]);
        }

        for (let x = -0.15; x <= 0.151; x += 0.025) {
            rod([x, -0.007, 0], [x, 0.007, 0], 0.0009);

            if (x + 0.025 <= 0.16) {
                rod(
                    [x, -0.007, 0],
                    [x + 0.025, 0.007, 0],
                    0.0008
                );
            }
        }
    }

    function createModules() {
        cylinder(
            0.015,
            0.065,
            materials.white,
            [0, 0, 0.021],
            [Math.PI / 2, 0, 0]
        );

        cylinder(
            0.011,
            0.039,
            materials.white,
            [0.022, -0.003, 0.011],
            [0, 0, Math.PI / 2]
        );

        cylinder(
            0.009,
            0.033,
            materials.silver,
            [-0.023, 0.004, 0.009],
            [0, 0, Math.PI / 2]
        );

        cylinder(
            0.013,
            0.025,
            materials.white,
            [0, 0, 0.062],
            [Math.PI / 2, 0, 0]
        );

        for (const z of [0.0, 0.018, 0.036, 0.054]) {
            cylinder(
                0.0155,
                0.002,
                materials.silver,
                [0, 0, z],
                [Math.PI / 2, 0, 0]
            );
        }

        box(
            0.023,
            0.015,
            0.018,
            materials.dark,
            [0, 0, -0.014]
        );

        box(
            0.031,
            0.011,
            0.022,
            materials.gold,
            [0.018, 0.015, 0.015]
        );

        for (const x of [-0.035, 0.035]) {
            rod(
                [x, -0.024, 0],
                [x, 0.024, 0],
                0.0014
            );

            rod(
                [x, 0, -0.022],
                [x, 0, 0.022],
                0.0012
            );
        }
    }

    function createSolarPanel(parent, centerY) {
        const panel = box(
            0.031,
            0.099,
            0.002,
            materials.solar,
            [0, centerY, 0],
            parent
        );

        const border = new THREE.EdgesGeometry(panel.geometry);
        const edges = new THREE.LineSegments(
            border,
            new THREE.LineBasicMaterial({
                color: 0xbba67e
            })
        );

        edges.position.copy(panel.position);
        parent.add(edges);

        const points = [];

        for (let column = 1; column < 5; column++) {
            const x = -0.0155 + column * (0.031 / 5);

            points.push(
                x, centerY - 0.0495, 0.0014,
                x, centerY + 0.0495, 0.0014
            );
        }

        for (let row = 1; row < 13; row++) {
            const y = centerY - 0.0495 + row * (0.099 / 13);

            points.push(
                -0.0155, y, 0.0014,
                0.0155, y, 0.0014
            );
        }

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(points, 3)
        );

        parent.add(
            new THREE.LineSegments(
                geometry,
                materials.solarGrid
            )
        );
    }

    function createSolarArrays() {
        const xPositions = [-0.129, -0.087, 0.087, 0.129];

        xPositions.forEach((x, index) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, 0, 0.002);

            group.add(pivot);

            box(
                0.004,
                0.24,
                0.004,
                materials.silver,
                [0, 0, -0.003],
                pivot
            );

            createSolarPanel(pivot, 0.064);
            createSolarPanel(pivot, -0.064);

            animatedArrays.push({
                pivot,
                phase: index * 0.7
            });
        });
    }

    function createAntennas() {
        rod(
            [-0.018, 0.015, 0.02],
            [-0.037, 0.037, 0.051],
            0.0009
        );

        rod(
            [0.015, -0.014, 0.025],
            [0.037, -0.035, 0.05],
            0.0009
        );

        const antenna = new THREE.Mesh(
            new THREE.ConeGeometry(
                0.011,
                0.018,
                20
            ),
            materials.white
        );

        antenna.position.set(-0.037, 0.037, 0.051);
        antenna.rotation.x = Math.PI / 2;
        group.add(antenna);

        const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.003, 10, 10),
            materials.light
        );

        beacon.position.set(0, 0.022, 0.02);
        group.add(beacon);

        return beacon;
    }

    createTruss();
    createModules();
    createSolarArrays();

    const beacon = createAntennas();

    group.traverse(child => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
        }
    });

    function update(time) {
        animatedArrays.forEach(({ pivot, phase }) => {
            pivot.rotation.y =
                Math.sin(time * 0.14 + phase) * 0.07;
        });

        beacon.visible =
            Math.sin(time * 3.5) > 0;
    }

    return {
        group,
        update
    };
}
