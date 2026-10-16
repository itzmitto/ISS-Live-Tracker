import * as THREE from "three";

export function createIssModel() {
    const station = new THREE.Group();
    station.name = "ISS Space Station";
    station.scale.setScalar(0.095);

    const materials = {
        hull: new THREE.MeshStandardMaterial({
            color: 0xd9e1e9,
            metalness: 0.72,
            roughness: 0.32
        }),
        white: new THREE.MeshStandardMaterial({
            color: 0xf4f7fa,
            metalness: 0.35,
            roughness: 0.48
        }),
        frame: new THREE.MeshStandardMaterial({
            color: 0x596b7c,
            metalness: 0.82,
            roughness: 0.27
        }),
        dark: new THREE.MeshStandardMaterial({
            color: 0x202d3b,
            metalness: 0.65,
            roughness: 0.36
        }),
        solar: new THREE.MeshStandardMaterial({
            color: 0x173d80,
            emissive: 0x071b3b,
            emissiveIntensity: 0.25,
            metalness: 0.45,
            roughness: 0.27,
            side: THREE.DoubleSide
        }),
        solarGrid: new THREE.MeshBasicMaterial({
            color: 0x6d9cca
        }),
        gold: new THREE.MeshStandardMaterial({
            color: 0xa88a45,
            metalness: 0.85,
            roughness: 0.26
        }),
        window: new THREE.MeshStandardMaterial({
            color: 0x183b62,
            metalness: 0.5,
            roughness: 0.2
        })
    };

    function box(parent, width, height, depth, material, x, y, z) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        mesh.position.set(x, y, z);
        parent.add(mesh);

        return mesh;
    }

    function cylinder(
        parent,
        radius,
        length,
        material,
        x,
        y,
        z,
        axis = "z"
    ) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                20
            ),
            material
        );

        if (axis === "z") {
            mesh.rotation.x = Math.PI / 2;
        } else if (axis === "x") {
            mesh.rotation.z = Math.PI / 2;
        }

        mesh.position.set(x, y, z);
        parent.add(mesh);

        return mesh;
    }

    function beam(parent, start, end, radius, material) {
        const a = new THREE.Vector3(...start);
        const b = new THREE.Vector3(...end);
        const direction = b.clone().sub(a);

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                direction.length(),
                6
            ),
            material
        );

        mesh.position.copy(a).add(b).multiplyScalar(0.5);

        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        parent.add(mesh);
        return mesh;
    }

    const truss = new THREE.Group();
    truss.name = "Integrated Truss Structure";
    station.add(truss);

    for (const y of [-0.065, 0.065]) {
        for (const z of [-0.055, 0.055]) {
            box(
                truss,
                2.4,
                0.018,
                0.018,
                materials.frame,
                0,
                y,
                z
            );
        }
    }

    for (let index = 0; index <= 16; index++) {
        const x = -1.2 + index * 0.15;

        beam(
            truss,
            [x, -0.065, -0.055],
            [x, 0.065, 0.055],
            0.008,
            materials.hull
        );

        beam(
            truss,
            [x, 0.065, -0.055],
            [x, -0.065, 0.055],
            0.008,
            materials.hull
        );

        if (index < 16) {
            const nextX = x + 0.15;

            beam(
                truss,
                [x, 0.065, -0.055],
                [nextX, -0.065, -0.055],
                0.007,
                materials.frame
            );

            beam(
                truss,
                [x, 0.065, 0.055],
                [nextX, -0.065, 0.055],
                0.007,
                materials.frame
            );
        }
    }

    const modules = new THREE.Group();
    modules.name = "Pressurized Modules";
    modules.position.y = -0.14;
    station.add(modules);

    cylinder(modules, 0.175, 0.82, materials.white, 0, 0, 0.03);
    cylinder(modules, 0.15, 0.42, materials.hull, 0, 0, -0.54);
    cylinder(modules, 0.14, 0.4, materials.white, 0, 0, 0.58);
    cylinder(modules, 0.11, 0.25, materials.hull, 0, 0, 0.9);

    for (const z of [-0.79, -0.36, 0.41, 0.78, 1.025]) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.15, 0.018, 8, 24),
            materials.frame
        );

        ring.position.z = z;
        modules.add(ring);
    }

    for (const z of [-0.2, 0.02, 0.24]) {
        for (const side of [-1, 1]) {
            const window = new THREE.Mesh(
                new THREE.SphereGeometry(0.035, 12, 12),
                materials.window
            );

            window.position.set(side * 0.174, 0, z);
            window.scale.set(0.25, 1, 1);
            modules.add(window);
        }
    }

    cylinder(
        modules,
        0.145,
        0.52,
        materials.white,
        0.3,
        0,
        0.08,
        "x"
    );

    cylinder(
        modules,
        0.075,
        0.18,
        materials.dark,
        0.61,
        0,
        0.08,
        "x"
    );

    const solarPivots = [];

    function createSolarPanel(parent, z) {
        const panel = new THREE.Group();
        panel.name = "Photovoltaic Solar Array";
        panel.position.z = z;
        parent.add(panel);

        box(
            panel,
            0.4,
            0.018,
            0.84,
            materials.solar,
            0,
            0,
            0
        );

        for (const x of [-0.21, 0.21]) {
            box(
                panel,
                0.017,
                0.024,
                0.87,
                materials.frame,
                x,
                0,
                0
            );
        }

        for (const edge of [-0.43, 0.43]) {
            box(
                panel,
                0.43,
                0.024,
                0.016,
                materials.frame,
                0,
                0,
                edge
            );
        }

        for (let column = 1; column < 6; column++) {
            const x = -0.2 + column * (0.4 / 6);

            box(
                panel,
                0.004,
                0.002,
                0.83,
                materials.solarGrid,
                x,
                0.011,
                0
            );
        }

        for (let row = 1; row < 11; row++) {
            const rowZ = -0.42 + row * (0.84 / 11);

            box(
                panel,
                0.4,
                0.002,
                0.004,
                materials.solarGrid,
                0,
                0.011,
                rowZ
            );
        }

        return panel;
    }

    for (const x of [-1.01, -0.55, 0.55, 1.01]) {
        const pivot = new THREE.Group();
        pivot.name = "Solar Array Tracking Assembly";
        pivot.position.set(x, 0.13, 0);

        beam(
            pivot,
            [0, 0, -1.05],
            [0, 0, 1.05],
            0.018,
            materials.hull
        );

        createSolarPanel(pivot, -0.58);
        createSolarPanel(pivot, 0.58);

        box(
            pivot,
            0.13,
            0.08,
            0.13,
            materials.gold,
            0,
            0,
            0
        );

        station.add(pivot);
        solarPivots.push(pivot);
    }

    for (const x of [-0.35, 0.35]) {
        for (const z of [-0.38, 0.38]) {
            box(
                station,
                0.13,
                0.012,
                0.34,
                materials.white,
                x,
                0.09,
                z
            );
        }
    }

    const dish = new THREE.Group();
    dish.name = "Communications Antenna";
    dish.position.set(-0.29, 0.15, -0.12);

    cylinder(
        dish,
        0.015,
        0.22,
        materials.frame,
        0,
        0.1,
        0,
        "y"
    );

    const reflector = new THREE.Mesh(
        new THREE.ConeGeometry(0.115, 0.065, 28),
        materials.white
    );

    reflector.position.y = 0.23;
    dish.add(reflector);

    const dishReceiver = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 12),
        materials.gold
    );

    dishReceiver.position.y = 0.3;
    dish.add(dishReceiver);
    station.add(dish);

    const beacons = [];

    for (const [x, color] of [
        [-1.22, 0xff675c],
        [1.22, 0x78e7ff]
    ]) {
        const material = new THREE.MeshBasicMaterial({ color });

        const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 12, 12),
            material
        );

        beacon.position.set(x, 0.075, 0);
        station.add(beacon);
        beacons.push(beacon);
    }

    function update(time, animateSolar = true) {
        solarPivots.forEach((pivot, index) => {
            if (animateSolar) {
                const direction = index % 2 === 0 ? 1 : -1;

                pivot.rotation.x =
                    direction * 0.12 * Math.sin(time * 0.15);
            }
        });

        beacons[0].visible = Math.sin(time * 2.8) > 0;
        beacons[1].visible = Math.sin(time * 2.8 + Math.PI) > 0;
    }

    return {
        group: station,
        update
    };
}
