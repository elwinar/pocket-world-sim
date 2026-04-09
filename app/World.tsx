import styles from "./World.module.css";

export function World({ world }) {
	return (
		<div
			className={styles.container}
			style={{ gridTemplateColumns: `repeat(${world.Width}, 1fr)` }}
		>
			{world?.Grid?.map((cell, i) => {
				return (
					<div key={i} className={styles.cell} data-biome={cell.Biome}></div>
				);
			})}
		</div>
	);
}
