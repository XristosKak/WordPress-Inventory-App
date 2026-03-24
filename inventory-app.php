<?php
/**
 * Plugin Name: Inventory App
 * Description: Εφαρμογή αποθέματος με shortcode [inventory_app] και σελίδα στο admin. Ίδια λειτουργικότητα με το theme (κατηγορία, μάρκα, πολλαπλές φωτογραφίες, CSV, PDF, στατιστικά).
 * Version: 1.0.0
 * Author: General Theme
 * Text Domain: inventory-app
 * Requires at least: 5.6
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'INVENTORY_APP_PLUGIN_LOADED', true );
define( 'INVENTORY_APP_VERSION', '1.0.0' );
define( 'INVENTORY_APP_PATH', plugin_dir_path( __FILE__ ) );
define( 'INVENTORY_APP_URL', plugin_dir_url( __FILE__ ) );

require_once INVENTORY_APP_PATH . 'includes/inventory-api.php';

/**
 * Enqueue assets για front (shortcode) ή admin.
 *
 * @param string $context 'front' | 'admin'
 */
function inventory_app_enqueue_assets( $context = 'front' ) {
	$is_admin = ( $context === 'admin' );
	$ver      = INVENTORY_APP_VERSION;

	wp_enqueue_style(
		'inventory-app-fonts',
		'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap',
		array(),
		null
	);

	wp_enqueue_style(
		'inventory-app',
		INVENTORY_APP_URL . 'assets/css/inventory-app.css',
		array( 'inventory-app-fonts' ),
		$ver
	);

	wp_enqueue_script(
		'inventory-app',
		INVENTORY_APP_URL . 'assets/js/inventory-app.js',
		array(),
		$ver,
		true
	);

	wp_localize_script(
		'inventory-app',
		'generalThemeInventory',
		array(
			'restUrl'    => rest_url( general_theme_inventory_rest_namespace() . '/' ),
			'restNonce'  => wp_create_nonce( 'wp_rest' ),
			'isLoggedIn' => is_user_logged_in(),
		)
	);
}

/**
 * Shortcode [inventory_app]
 */
function inventory_app_shortcode() {
	inventory_app_enqueue_assets( 'front' );
	return '<div id="inventory-app" class="inventory-app inventory-app--wide" role="application" aria-label="Εφαρμογή αποθέματος"></div>';
}
add_shortcode( 'inventory_app', 'inventory_app_shortcode' );

/**
 * Μενού admin + σελίδα.
 */
function inventory_app_admin_menu() {
	add_menu_page(
		__( 'Απόθεμα', 'inventory-app' ),
		__( 'Απόθεμα', 'inventory-app' ),
		'edit_posts',
		'inventory-app',
		'inventory_app_admin_page',
		'dashicons-portfolio',
		26
	);
}

function inventory_app_admin_page() {
	inventory_app_enqueue_assets( 'admin' );
	?>
	<div class="wrap inventory-app-admin-wrap">
		<h1 class="wp-heading-inline"><?php esc_html_e( 'Απόθεμα', 'inventory-app' ); ?></h1>
		<p class="inventory-app-admin-desc"><?php esc_html_e( 'Διαχείριση προϊόντων. Τα δεδομένα αποθηκεύονται στη βάση.', 'inventory-app' ); ?></p>
		<div id="inventory-app" class="inventory-app inventory-app--wide" role="application" aria-label="<?php esc_attr_e( 'Εφαρμογή αποθέματος', 'inventory-app' ); ?>"></div>
	</div>
	<style>
		.inventory-app-admin-wrap { max-width: none; padding-right: 20px; }
		.inventory-app-admin-desc { margin-bottom: 1rem; color: #646970; }
		body.inventory-app-admin .inventory-app--wide { max-width: 100%; }
	</style>
	<?php
}
add_action( 'admin_menu', 'inventory_app_admin_menu' );

/**
 * Body class στο admin όταν βρισκόμαστε στη σελίδα Απόθεμα.
 */
function inventory_app_admin_body_class( $classes ) {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && $screen->id === 'toplevel_page_inventory-app' ) {
		$classes .= ' inventory-app-page inventory-app-admin ';
	}
	return $classes;
}
add_filter( 'admin_body_class', 'inventory_app_admin_body_class' );
