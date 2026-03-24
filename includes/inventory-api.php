<?php
/**
 * Inventory App — CPT, REST API, options (plugin copy).
 *
 * @package Inventory_App
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'GENERAL_THEME_INV_CPT' ) ) {
	define( 'GENERAL_THEME_INV_CPT', 'inv_product' );
}
if ( ! defined( 'GENERAL_THEME_INV_OPTION_TAGS' ) ) {
	define( 'GENERAL_THEME_INV_OPTION_TAGS', 'general_theme_inventory_tags' );
}
if ( ! defined( 'GENERAL_THEME_INV_OPTION_CATEGORIES' ) ) {
	define( 'GENERAL_THEME_INV_OPTION_CATEGORIES', 'general_theme_inventory_categories' );
}

function general_theme_inventory_register_cpt() {
	$labels = array(
		'name'               => _x( 'Προϊόντα αποθέματος', 'post type general name', 'inventory-app' ),
		'singular_name'      => _x( 'Προϊόν', 'post type singular name', 'inventory-app' ),
		'menu_name'          => __( 'Απόθεμα', 'inventory-app' ),
		'add_new'            => __( 'Προσθήκη', 'inventory-app' ),
		'add_new_item'       => __( 'Νέο προϊόν', 'inventory-app' ),
		'edit_item'          => __( 'Επεξεργασία προϊόντος', 'inventory-app' ),
		'new_item'           => __( 'Νέο προϊόν', 'inventory-app' ),
		'view_item'          => __( 'Προβολή', 'inventory-app' ),
		'search_items'       => __( 'Αναζήτηση', 'inventory-app' ),
		'not_found'          => __( 'Δεν βρέθηκαν προϊόντα', 'inventory-app' ),
		'not_found_in_trash' => __( 'Δεν βρέθηκαν στο καλάθι', 'inventory-app' ),
	);
	$args = array(
		'labels'             => $labels,
		'public'             => false,
		'publicly_queryable' => false,
		'show_ui'            => true,
		'show_in_menu'       => false,
		'menu_icon'          => 'dashicons-portfolio',
		'capability_type'    => 'post',
		'map_meta_cap'       => true,
		'hierarchical'       => false,
		'supports'           => array( 'title' ),
		'has_archive'        => false,
		'rewrite'            => false,
		'query_var'          => false,
		'show_in_rest'       => false,
	);
	register_post_type( GENERAL_THEME_INV_CPT, $args );
}
add_action( 'init', 'general_theme_inventory_register_cpt' );

function general_theme_inventory_register_meta() {
	$meta_keys = array(
		'inv_quantity'   => array( 'type' => 'integer', 'default' => 0 ),
		'inv_serial'     => array( 'type' => 'string', 'default' => '' ),
		'inv_functional' => array( 'type' => 'string', 'default' => 'unknown' ),
		'inv_grade'      => array( 'type' => 'string', 'default' => 'B' ),
		'inv_tags'       => array( 'type' => 'array', 'default' => array() ),
		'inv_category'   => array( 'type' => 'string', 'default' => '' ),
		'inv_brand'      => array( 'type' => 'string', 'default' => '' ),
		'inv_specs'      => array( 'type' => 'string', 'default' => '' ),
		'inv_photos'     => array( 'type' => 'array', 'default' => array() ),
	);
	foreach ( $meta_keys as $key => $config ) {
		register_post_meta(
			GENERAL_THEME_INV_CPT,
			$key,
			array(
				'type'          => $config['type'],
				'default'       => $config['default'],
				'single'        => true,
				'show_in_rest'  => true,
				'auth_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}
}
add_action( 'init', 'general_theme_inventory_register_meta', 20 );

function general_theme_inventory_default_categories() {
	return array( 'Υπολογιστής', 'Οθόνη', 'Κονσόλα τηλεφώνου', 'Τηλέφωνο', 'Tablet', 'Αξεσουάρ', 'Άλλο' );
}

function general_theme_inventory_get_categories() {
	$saved = get_option( GENERAL_THEME_INV_OPTION_CATEGORIES, array() );
	if ( ! is_array( $saved ) || empty( $saved ) ) {
		return general_theme_inventory_default_categories();
	}
	return $saved;
}

function general_theme_inventory_save_categories( $categories ) {
	if ( ! is_array( $categories ) ) {
		return false;
	}
	$categories = array_values( array_unique( array_map( 'sanitize_text_field', $categories ) ) );
	return update_option( GENERAL_THEME_INV_OPTION_CATEGORIES, $categories );
}

function general_theme_inventory_get_tags() {
	$defaults = array( 'Χρήζει format', 'Έλεγχος μπαταρίας', 'Γνήσιο κουτί', 'Refurbished', 'Για ανταλλακτικά' );
	$saved = get_option( GENERAL_THEME_INV_OPTION_TAGS, array() );
	if ( ! is_array( $saved ) || empty( $saved ) ) {
		return $defaults;
	}
	return $saved;
}

function general_theme_inventory_save_tags( $tags ) {
	if ( ! is_array( $tags ) ) {
		return false;
	}
	$tags = array_values( array_unique( array_map( 'sanitize_text_field', $tags ) ) );
	return update_option( GENERAL_THEME_INV_OPTION_TAGS, $tags );
}

function general_theme_inventory_post_to_item( $post ) {
	$photo_ids = get_post_meta( $post->ID, 'inv_photos', true );
	if ( ! is_array( $photo_ids ) ) {
		$photo_ids = array();
	}
	$photo_urls = array();
	foreach ( $photo_ids as $aid ) {
		$url = wp_get_attachment_image_url( (int) $aid, 'medium' );
		if ( $url ) {
			$photo_urls[] = $url;
		}
	}
	$tags = get_post_meta( $post->ID, 'inv_tags', true );
	if ( ! is_array( $tags ) ) {
		$tags = array();
	}
	$functional_raw = get_post_meta( $post->ID, 'inv_functional', true );
	if ( $functional_raw === true || $functional_raw === '1' || $functional_raw === 'yes' ) {
		$functional = 'yes';
	} elseif ( $functional_raw === false || $functional_raw === '0' || $functional_raw === 'no' ) {
		$functional = 'no';
	} else {
		$functional = in_array( $functional_raw, array( 'yes', 'no', 'unknown' ), true ) ? $functional_raw : 'unknown';
	}
	return array(
		'id'         => (string) $post->ID,
		'name'       => $post->post_title,
		'quantity'   => (int) get_post_meta( $post->ID, 'inv_quantity', true ),
		'serial'     => (string) get_post_meta( $post->ID, 'inv_serial', true ),
		'functional' => $functional,
		'grade'      => (string) get_post_meta( $post->ID, 'inv_grade', true ),
		'tags'       => $tags,
		'category'   => (string) get_post_meta( $post->ID, 'inv_category', true ),
		'brand'      => (string) get_post_meta( $post->ID, 'inv_brand', true ),
		'specs'      => (string) get_post_meta( $post->ID, 'inv_specs', true ),
		'photo_ids'  => array_map( 'intval', $photo_ids ),
		'photo_urls' => $photo_urls,
	);
}

function general_theme_inventory_rest_namespace() {
	return 'general-theme/v1';
}

function general_theme_inventory_rest_read_permission( $request ) {
	return true;
}

function general_theme_inventory_rest_edit_permission( $request ) {
	return current_user_can( 'edit_posts' );
}

function general_theme_inventory_rest_get_items( $request ) {
	$posts = get_posts( array( 'post_type' => GENERAL_THEME_INV_CPT, 'post_status' => 'any', 'posts_per_page' => -1, 'orderby' => 'date', 'order' => 'DESC' ) );
	$items = array();
	foreach ( $posts as $post ) {
		$items[] = general_theme_inventory_post_to_item( $post );
	}
	return rest_ensure_response( $items );
}

function general_theme_inventory_rest_create_item( $request ) {
	$params = $request->get_json_params();
	$name   = isset( $params['name'] ) ? sanitize_text_field( $params['name'] ) : '';
	if ( $name === '' ) {
		$name = __( 'Χωρίς όνομα', 'inventory-app' );
	}
	$post_id = wp_insert_post( array( 'post_type' => GENERAL_THEME_INV_CPT, 'post_title' => $name, 'post_status' => 'publish' ), true );
	if ( is_wp_error( $post_id ) ) {
		return new WP_Error( 'create_failed', $post_id->get_error_message(), array( 'status' => 500 ) );
	}
	general_theme_inventory_update_item_meta( $post_id, $params );
	return rest_ensure_response( general_theme_inventory_post_to_item( get_post( $post_id ) ) );
}

function general_theme_inventory_update_item_meta( $post_id, $params ) {
	$allowed_grades = array( 'A+', 'A', 'B', 'C', 'D', 'AS-IS', 'Unknown' );
	$allowed_functional = array( 'yes', 'no', 'unknown' );
	if ( isset( $params['name'] ) ) {
		wp_update_post( array( 'ID' => $post_id, 'post_title' => sanitize_text_field( $params['name'] ) ) );
	}
	if ( array_key_exists( 'quantity', $params ) ) {
		update_post_meta( $post_id, 'inv_quantity', max( 0, (int) $params['quantity'] ) );
	}
	if ( array_key_exists( 'serial', $params ) ) {
		update_post_meta( $post_id, 'inv_serial', sanitize_text_field( $params['serial'] ) );
	}
	if ( array_key_exists( 'functional', $params ) && in_array( $params['functional'], $allowed_functional, true ) ) {
		update_post_meta( $post_id, 'inv_functional', $params['functional'] );
	}
	if ( isset( $params['grade'] ) && in_array( $params['grade'], $allowed_grades, true ) ) {
		update_post_meta( $post_id, 'inv_grade', $params['grade'] );
	}
	if ( isset( $params['tags'] ) && is_array( $params['tags'] ) ) {
		update_post_meta( $post_id, 'inv_tags', array_map( 'sanitize_text_field', $params['tags'] ) );
	}
	if ( array_key_exists( 'category', $params ) ) {
		update_post_meta( $post_id, 'inv_category', sanitize_text_field( $params['category'] ) );
	}
	if ( array_key_exists( 'brand', $params ) ) {
		update_post_meta( $post_id, 'inv_brand', sanitize_text_field( $params['brand'] ) );
	}
	if ( array_key_exists( 'specs', $params ) ) {
		update_post_meta( $post_id, 'inv_specs', sanitize_text_field( $params['specs'] ) );
	}
	if ( isset( $params['photo_ids'] ) && is_array( $params['photo_ids'] ) ) {
		update_post_meta( $post_id, 'inv_photos', array_map( 'absint', $params['photo_ids'] ) );
	}
}

function general_theme_inventory_rest_update_item( $request ) {
	$id   = (int) $request['id'];
	$post = get_post( $id );
	if ( ! $post || $post->post_type !== GENERAL_THEME_INV_CPT ) {
		return new WP_Error( 'not_found', __( 'Δεν βρέθηκε το προϊόν', 'inventory-app' ), array( 'status' => 404 ) );
	}
	$params = $request->get_json_params();
	general_theme_inventory_update_item_meta( $id, $params );
	return rest_ensure_response( general_theme_inventory_post_to_item( get_post( $id ) ) );
}

function general_theme_inventory_rest_delete_item( $request ) {
	$id   = (int) $request['id'];
	$post = get_post( $id );
	if ( ! $post || $post->post_type !== GENERAL_THEME_INV_CPT ) {
		return new WP_Error( 'not_found', __( 'Δεν βρέθηκε το προϊόν', 'inventory-app' ), array( 'status' => 404 ) );
	}
	wp_delete_post( $id, true );
	return rest_ensure_response( array( 'deleted' => true ) );
}

function general_theme_inventory_rest_get_tags( $request ) {
	return rest_ensure_response( general_theme_inventory_get_tags() );
}

function general_theme_inventory_rest_save_tags( $request ) {
	$params = $request->get_json_params();
	$tags   = isset( $params['tags'] ) && is_array( $params['tags'] ) ? $params['tags'] : array();
	general_theme_inventory_save_tags( $tags );
	return rest_ensure_response( general_theme_inventory_get_tags() );
}

function general_theme_inventory_rest_get_categories( $request ) {
	return rest_ensure_response( general_theme_inventory_get_categories() );
}

function general_theme_inventory_rest_save_categories( $request ) {
	$params     = $request->get_json_params();
	$categories = isset( $params['categories'] ) && is_array( $params['categories'] ) ? $params['categories'] : array();
	general_theme_inventory_save_categories( $categories );
	return rest_ensure_response( general_theme_inventory_get_categories() );
}

function general_theme_inventory_rest_upload_photo( $request ) {
	$params = $request->get_json_params();
	$b64    = isset( $params['data'] ) ? $params['data'] : '';
	if ( $b64 === '' || strpos( $b64, 'data:image' ) !== 0 ) {
		return new WP_Error( 'invalid_data', __( 'Μη έγκυρα δεδομένα εικόνας', 'inventory-app' ), array( 'status' => 400 ) );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$tmp     = wp_tempnam( 'inv' );
	$decoded = base64_decode( preg_replace( '#^data:image/\w+;base64,#i', '', $b64 ), true );
	if ( $decoded === false ) {
		@unlink( $tmp );
		return new WP_Error( 'decode_failed', __( 'Αποτυχία αποκωδικοποίησης', 'inventory-app' ), array( 'status' => 400 ) );
	}
	file_put_contents( $tmp, $decoded );
	$file = array( 'name' => 'inventory-' . uniqid() . '.jpg', 'tmp_name' => $tmp, 'size' => filesize( $tmp ), 'error' => 0, 'type' => 'image/jpeg' );
	$id   = media_handle_sideload( $file, 0 );
	@unlink( $tmp );
	if ( is_wp_error( $id ) ) {
		return new WP_Error( 'upload_failed', $id->get_error_message(), array( 'status' => 500 ) );
	}
	$url = wp_get_attachment_image_url( $id, 'medium' );
	if ( ! $url ) {
		$url = wp_get_attachment_url( $id );
	}
	return rest_ensure_response( array( 'id' => $id, 'url' => $url ) );
}

function general_theme_inventory_rest_export_csv( $request ) {
	$functional_labels = array( 'yes' => 'Λειτουργεί', 'no' => 'Δεν λειτουργεί', 'unknown' => 'Άγνωστο' );
	$posts   = get_posts( array( 'post_type' => GENERAL_THEME_INV_CPT, 'post_status' => 'any', 'posts_per_page' => -1, 'orderby' => 'date', 'order' => 'DESC' ) );
	$headers = array( 'ID', 'Ονομα', 'Κατηγορια', 'Μαρκα', 'Ποσοτητα', 'Σειριακο', 'Λειτουργικοτητα', 'Grade', 'Αλλα χαρακτηριστικα', 'Ετικετες', 'Φωτογραφιες (URLs)' );
	$rows    = array( $headers );
	foreach ( $posts as $post ) {
		$item      = general_theme_inventory_post_to_item( $post );
		$photo_ids = get_post_meta( $post->ID, 'inv_photos', true );
		$urls      = array();
		if ( is_array( $photo_ids ) ) {
			foreach ( $photo_ids as $aid ) {
				$u = wp_get_attachment_image_url( (int) $aid, 'full' );
				if ( $u ) {
					$urls[] = $u;
				}
			}
		}
		$func_label = isset( $functional_labels[ $item['functional'] ] ) ? $functional_labels[ $item['functional'] ] : 'Αγνωστο';
		$rows[] = array( $item['id'], $item['name'], $item['category'], $item['brand'], $item['quantity'], $item['serial'], $func_label, $item['grade'], isset( $item['specs'] ) ? $item['specs'] : '', implode( '; ', $item['tags'] ), implode( ' ', $urls ) );
	}
	$fp = fopen( 'php://temp', 'r+' );
	foreach ( $rows as $row ) {
		fputcsv( $fp, $row, ',', '"' );
	}
	rewind( $fp );
	$csv = stream_get_contents( $fp );
	fclose( $fp );
	return new WP_REST_Response( $csv, 200, array( 'Content-Type' => 'text/csv; charset=utf-8', 'Content-Disposition' => 'attachment; filename="inventory-export-' . date( 'Y-m-d' ) . '.csv"', 'Cache-Control' => 'no-cache' ) );
}

function general_theme_inventory_rest_routes() {
	$ns = general_theme_inventory_rest_namespace();
	register_rest_route( $ns, '/inventory/items', array(
		array( 'methods' => WP_REST_Server::READABLE, 'callback' => 'general_theme_inventory_rest_get_items', 'permission_callback' => 'general_theme_inventory_rest_read_permission' ),
		array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => 'general_theme_inventory_rest_create_item', 'permission_callback' => 'general_theme_inventory_rest_edit_permission' ),
	) );
	register_rest_route( $ns, '/inventory/items/(?P<id>\d+)', array(
		array( 'methods' => WP_REST_Server::EDITABLE, 'callback' => 'general_theme_inventory_rest_update_item', 'permission_callback' => 'general_theme_inventory_rest_edit_permission', 'args' => array( 'id' => array( 'required' => true, 'type' => 'integer' ) ) ),
		array( 'methods' => WP_REST_Server::DELETABLE, 'callback' => 'general_theme_inventory_rest_delete_item', 'permission_callback' => 'general_theme_inventory_rest_edit_permission', 'args' => array( 'id' => array( 'required' => true, 'type' => 'integer' ) ) ),
	) );
	register_rest_route( $ns, '/inventory/tags', array(
		array( 'methods' => WP_REST_Server::READABLE, 'callback' => 'general_theme_inventory_rest_get_tags', 'permission_callback' => 'general_theme_inventory_rest_read_permission' ),
		array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => 'general_theme_inventory_rest_save_tags', 'permission_callback' => 'general_theme_inventory_rest_edit_permission' ),
	) );
	register_rest_route( $ns, '/inventory/categories', array(
		array( 'methods' => WP_REST_Server::READABLE, 'callback' => 'general_theme_inventory_rest_get_categories', 'permission_callback' => 'general_theme_inventory_rest_read_permission' ),
		array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => 'general_theme_inventory_rest_save_categories', 'permission_callback' => 'general_theme_inventory_rest_edit_permission' ),
	) );
	register_rest_route( $ns, '/inventory/upload-photo', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => 'general_theme_inventory_rest_upload_photo', 'permission_callback' => 'general_theme_inventory_rest_edit_permission' ) );
	register_rest_route( $ns, '/inventory/export-csv', array( 'methods' => WP_REST_Server::READABLE, 'callback' => 'general_theme_inventory_rest_export_csv', 'permission_callback' => 'general_theme_inventory_rest_read_permission' ) );
}
add_action( 'rest_api_init', 'general_theme_inventory_rest_routes' );
