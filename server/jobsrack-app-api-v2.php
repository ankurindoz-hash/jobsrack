// JobsRack app API v2: accounts, applications, messages, salaries, companies, articles, pages,
// and employer tools (post jobs, applicants, candidate search). Used by the JobsRack mobile app.

/* ---------- Sign-in tokens ---------- */
function jr19_tok_hash( $t ) { return hash( 'sha256', $t . wp_salt( 'auth' ) ); }
function jr19_issue_token( $uid ) {
	$raw  = $uid . '.' . wp_generate_password( 40, false, false );
	$list = get_user_meta( $uid, 'jr19_tokens', true );
	$list = is_array( $list ) ? $list : array();
	$now  = time();
	foreach ( $list as $h => $exp ) if ( $exp < $now ) unset( $list[ $h ] );
	$list[ jr19_tok_hash( $raw ) ] = $now + 180 * DAY_IN_SECONDS;
	if ( count( $list ) > 10 ) $list = array_slice( $list, -10, null, true );
	update_user_meta( $uid, 'jr19_tokens', $list );
	return $raw;
}
function jr19_raw_token() {
	$h = '';
	if ( ! empty( $_SERVER['HTTP_AUTHORIZATION'] ) ) $h = $_SERVER['HTTP_AUTHORIZATION'];
	elseif ( ! empty( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
	if ( preg_match( '/Bearer\s+(\S+)/i', $h, $m ) ) return $m[1];
	if ( ! empty( $_SERVER['HTTP_X_JR_TOKEN'] ) ) return trim( $_SERVER['HTTP_X_JR_TOKEN'] );
	if ( ! empty( $_POST['jr_app_token'] ) ) return trim( (string) $_POST['jr_app_token'] );
	return '';
}
function jr19_token_user( $raw ) {
	if ( ! preg_match( '/^(\d+)\.[A-Za-z0-9]{40}$/', $raw, $m ) ) return 0;
	$list = get_user_meta( (int) $m[1], 'jr19_tokens', true );
	$h    = jr19_tok_hash( $raw );
	return ( is_array( $list ) && isset( $list[ $h ] ) && $list[ $h ] > time() ) ? (int) $m[1] : 0;
}
add_filter( 'determine_current_user', function ( $uid ) {
	if ( $uid ) return $uid;
	$uri = (string) ( $_SERVER['REQUEST_URI'] ?? '' );
	if ( false === strpos( $uri, 'jobsrack/v1' ) && false === strpos( $uri, 'admin-ajax.php' ) ) return $uid;
	$raw = jr19_raw_token();
	return $raw ? ( jr19_token_user( $raw ) ?: $uid ) : $uid;
}, 30 );

/* ---------- Helpers ---------- */
function jr19_err( $msg, $code = 400 ) { return new WP_Error( 'jr', $msg, array( 'status' => $code ) ); }
function jr19_role( $u ) {
	$r = (array) $u->roles;
	if ( in_array( 'cs_employer', $r, true ) ) return 'employer';
	if ( in_array( 'administrator', $r, true ) ) return 'employer';
	return 'candidate';
}
function jr19_auth() { return is_user_logged_in() ? true : jr19_err( 'Please sign in.', 401 ); }
function jr19_emp_auth() {
	if ( ! is_user_logged_in() ) return jr19_err( 'Please sign in.', 401 );
	return 'employer' === jr19_role( wp_get_current_user() ) ? true : jr19_err( 'This needs an employer account.', 403 );
}
function jr19_rate( $key, $max, $secs = HOUR_IN_SECONDS ) {
	$k = 'jr19_rl_' . md5( $key . '|' . ( $_SERVER['REMOTE_ADDR'] ?? '' ) );
	$n = (int) get_transient( $k );
	if ( $n >= $max ) return false;
	set_transient( $k, $n + 1, $secs );
	return true;
}
function jr19_site() { return function_exists( 'jra_site' ) ? jra_site() : 'gl'; }
function jr19_user( $u ) {
	$u    = is_object( $u ) ? $u : get_userdata( (int) $u );
	$emp  = 'employer' === jr19_role( $u );
	$cv   = (string) get_user_meta( $u->ID, 'cs_candidate_cv', true );
	$name = $emp ? ( get_user_meta( $u->ID, 'jr_contact_name', true ) ?: $u->display_name ) : $u->display_name;
	return array(
		'id'          => (int) $u->ID,
		'role'        => $emp ? 'employer' : 'candidate',
		'name'        => html_entity_decode( (string) $name, ENT_QUOTES ),
		'email'       => $u->user_email,
		'phone'       => (string) get_user_meta( $u->ID, 'cs_phone_number', true ),
		'city'        => (string) get_user_meta( $u->ID, 'jr_city', true ),
		'headline'    => (string) get_user_meta( $u->ID, 'jr_headline', true ),
		'company'     => $emp ? html_entity_decode( $u->display_name, ENT_QUOTES ) : '',
		'website'     => (string) $u->user_url,
		'about'       => (string) $u->description,
		'resume_name' => $cv ? preg_replace( '/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.\w+$/', '', basename( $cv ) ) : '',
		'resume_url'  => $cv,
	);
}
function jr19_card( $id ) {
	if ( function_exists( 'jra_card' ) ) return jra_card( $id );
	return array( 'id' => $id, 'title' => get_the_title( $id ), 'company' => '', 'city' => '', 'pay' => '', 'posted' => (int) get_post_time( 'U', true, $id ), 'badges' => array(), 'summary' => '', 'url' => get_permalink( $id ) );
}
function jr19_upload_resume( $field ) {
	if ( empty( $_FILES[ $field ]['name'] ) ) return '';
	if ( ! empty( $_FILES[ $field ]['error'] ) ) return jr19_err( 'Your resume could not be uploaded. Please try again.' );
	if ( (int) $_FILES[ $field ]['size'] > 5 * MB_IN_BYTES ) return jr19_err( 'Your resume is too large. The limit is 5 MB.' );
	$ext = strtolower( pathinfo( $_FILES[ $field ]['name'], PATHINFO_EXTENSION ) );
	if ( ! in_array( $ext, array( 'pdf', 'doc', 'docx', 'rtf' ), true ) ) return jr19_err( 'Please upload your resume as a PDF or Word file.' );
	require_once ABSPATH . 'wp-admin/includes/file.php';
	$r = wp_handle_upload( $_FILES[ $field ], array( 'test_form' => false, 'mimes' => array( 'pdf' => 'application/pdf', 'doc' => 'application/msword', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'rtf' => 'application/rtf' ) ) );
	if ( ! empty( $r['error'] ) ) return jr19_err( wp_strip_all_tags( $r['error'] ) );
	return $r['url'];
}
function jr19_applied_ids( $uid ) {
	$a = get_user_meta( $uid, 'cs-jobs-applied', true );
	return is_array( $a ) ? array_map( 'intval', $a ) : array();
}
function jr19_app_status( $uid, $job ) {
	$s = strtolower( (string) get_user_meta( $uid, 'cs_job_application_status_' . $job, true ) );
	if ( false !== strpos( $s, 'short' ) ) return 'shortlisted';
	if ( preg_match( '/reject|declin|not/', $s ) ) return 'rejected';
	return 'new';
}
function jr19_applicant_ids( $job ) {
	global $wpdb;
	return array_map( 'intval', $wpdb->get_col( $wpdb->prepare( "SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = 'cs-jobs-applied' AND meta_value LIKE %s", '%"' . (int) $job . '"%' ) ) );
}
function jr19_owner_ok( $job, $uid ) {
	$u = get_userdata( $uid );
	if ( ! $u || 'jobs' !== get_post_type( $job ) ) return false;
	return user_can( $u, 'manage_options' ) || (string) get_post_meta( $job, 'cs_job_username', true ) === $u->user_login;
}
function jr19_city( $s ) { return trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $s ) ) ); }

/* ---------- Messages (shared with the website's /messages/ page) ---------- */
function jr19_thread_msgs( $key ) {
	return get_posts( array( 'post_type' => 'jr_msg', 'post_status' => 'private', 'posts_per_page' => 300, 'orderby' => 'date', 'order' => 'ASC', 'meta_query' => array( array( 'key' => 'jr_thread', 'value' => $key ) ) ) );
}
function jr19_thread_parties( $key ) {
	// "job-cand" (about a job) or "d{emp}-cand" (direct, from candidate search)
	if ( preg_match( '/^d(\d+)-(\d+)$/', $key, $m ) ) return array( 0, (int) $m[2], (int) $m[1] );
	if ( preg_match( '/^(\d+)-(\d+)$/', $key, $m ) ) {
		$emp = function_exists( 'jr3_job_owner_id' ) ? jr3_job_owner_id( (int) $m[1] ) : (int) get_post_field( 'post_author', (int) $m[1] );
		return array( (int) $m[1], (int) $m[2], $emp );
	}
	return null;
}
function jr19_thread_info( $key, $uid ) {
	list( $job, $cand, $emp ) = jr19_thread_parties( $key );
	$msgs = jr19_thread_msgs( $key );
	$last = end( $msgs );
	$seen = (int) get_user_meta( $uid, jr19_seen_key( $key ), true );
	$other_id = $uid === $cand ? $emp : $cand;
	$other    = get_userdata( $other_id );
	$with     = $uid === $cand ? ( $job && function_exists( 'jr3_company' ) ? jr3_company( $job ) : '' ) : '';
	if ( '' === $with ) $with = $other ? html_entity_decode( $other->display_name, ENT_QUOTES ) : 'JobsRack user';
	return array(
		'id'     => $key,
		'with'   => $with,
		'job'    => $job ? html_entity_decode( get_the_title( $job ), ENT_QUOTES ) : '',
		'last'   => $last ? wp_trim_words( $last->post_content, 18 ) : '',
		'time'   => $last ? (int) get_post_time( 'U', true, $last ) : 0,
		'unread' => $last && (int) $last->post_author !== $uid && (int) get_post_time( 'U', true, $last ) > $seen,
	);
}
function jr19_seen_key( $key ) {
	list( $job, $cand ) = jr19_thread_parties( $key );
	return 'jr3_seen_' . ( $job ? $job . '_' . $cand : $key );
}
function jr19_can_thread( $key, $uid ) {
	$p = jr19_thread_parties( $key );
	if ( ! $p ) return false;
	return $uid === $p[1] || $uid === $p[2] || user_can( $uid, 'manage_options' );
}
function jr19_post_msg( $key, $uid, $text ) {
	list( $job, $cand, $emp ) = jr19_thread_parties( $key );
	if ( ! jr19_rate( 'msg' . $uid, 40 ) ) return jr19_err( 'You have sent a lot of messages in the last hour. Please try again later.', 429 );
	$pid = wp_insert_post( array( 'post_type' => 'jr_msg', 'post_status' => 'private', 'post_author' => $uid, 'post_content' => mb_substr( $text, 0, 4000 ), 'post_title' => 'msg' ) );
	if ( ! $pid || is_wp_error( $pid ) ) return jr19_err( 'Could not send. Please try again.' );
	update_post_meta( $pid, 'jr_thread', $key );
	update_post_meta( $pid, 'jr_cand', $cand );
	update_post_meta( $pid, 'jr_emp', $emp );
	update_post_meta( $pid, 'jr_job', $job );
	update_user_meta( $uid, jr19_seen_key( $key ), time() + 1 );
	$to = get_userdata( $uid === $cand ? $emp : $cand );
	if ( $to && $to->user_email ) {
		$about = $job ? ' about the job "' . get_the_title( $job ) . '"' : '';
		$from  = get_userdata( $uid );
		wp_mail( $to->user_email, 'New message on ' . get_bloginfo( 'name' ) . ( $job ? ': ' . get_the_title( $job ) : '' ), 'Hello ' . $to->display_name . ",\n\nYou have a new message from " . ( $from ? $from->display_name : 'someone' ) . ' on ' . get_bloginfo( 'name' ) . $about . ":\n\n" . mb_substr( $text, 0, 600 ) . "\n\nReply in the JobsRack app (Account > Messages)" . ( $job ? ' or here: ' . add_query_arg( array( 'job' => $job, 'cand' => $cand ), home_url( '/messages/' ) ) : '' ) . "\n" );
	}
	return array( 'id' => (int) $pid, 'mine' => true, 'text' => mb_substr( $text, 0, 4000 ), 'time' => time() );
}

/* ---------- Routes ---------- */
add_action( 'rest_api_init', function () {
	$ns  = 'jobsrack/v1';
	$pub = '__return_true';
	$reg = function ( $route, $method, $cb, $perm ) use ( $ns ) { register_rest_route( $ns, $route, array( 'methods' => $method, 'callback' => $cb, 'permission_callback' => $perm ) ); };

	/* Accounts */
	$reg( '/auth/login', 'POST', function ( WP_REST_Request $r ) {
		if ( ! jr19_rate( 'login', 20 ) ) return jr19_err( 'Too many sign-in attempts. Please try again in an hour.', 429 );
		$login = trim( (string) $r->get_param( 'login' ) );
		$u     = wp_authenticate( $login, (string) $r->get_param( 'password' ) );
		if ( is_wp_error( $u ) ) return jr19_err( 'That email or password is not right. Please try again, or reset your password.', 403 );
		update_user_meta( $u->ID, 'user_last_login', time() );
		return array( 'token' => jr19_issue_token( $u->ID ), 'user' => jr19_user( $u ) );
	}, $pub );

	$reg( '/auth/register', 'POST', function ( WP_REST_Request $r ) {
		if ( ! jr19_rate( 'register', 8 ) ) return jr19_err( 'Too many new accounts from your connection. Please try again later.', 429 );
		$role  = 'employer' === $r->get_param( 'role' ) ? 'employer' : 'candidate';
		$name  = sanitize_text_field( (string) $r->get_param( 'name' ) );
		$email = sanitize_email( (string) $r->get_param( 'email' ) );
		$phone = preg_replace( '/[^0-9+()\- ]/', '', (string) $r->get_param( 'phone' ) );
		$pass  = (string) $r->get_param( 'password' );
		$co    = sanitize_text_field( (string) $r->get_param( 'company' ) );
		if ( mb_strlen( $name ) < 2 ) return jr19_err( 'Please enter your full name.' );
		if ( ! is_email( $email ) ) return jr19_err( 'Please enter a valid email address.' );
		if ( strlen( $pass ) < 8 ) return jr19_err( 'Your password needs at least 8 characters.' );
		if ( 'employer' === $role && mb_strlen( $co ) < 2 ) return jr19_err( 'Please enter your company name.' );
		if ( email_exists( $email ) ) return jr19_err( 'There is already an account with this email. Please sign in, or reset your password.', 409 );
		$base = sanitize_user( strtolower( strtok( $email, '@' ) ), true );
		$base = '' === $base ? 'user' : substr( $base, 0, 40 );
		do { $login = $base . '-' . wp_rand( 100, 99999 ); } while ( username_exists( $login ) );
		$parts = preg_split( '/\s+/', $name, 2 );
		$uid   = wp_insert_user( array(
			'user_login' => $login, 'user_email' => $email, 'user_pass' => $pass,
			'display_name' => 'employer' === $role ? $co : $name, 'first_name' => $parts[0], 'last_name' => $parts[1] ?? '',
			'role' => 'employer' === $role ? 'cs_employer' : 'cs_candidate',
		) );
		if ( is_wp_error( $uid ) ) return jr19_err( 'We could not create your account. Please try again.' );
		update_user_meta( $uid, 'cs_phone_number', $phone );
		update_user_meta( $uid, 'cs_user_status', 'active' );
		update_user_meta( $uid, 'jr_app_signup', time() );
		if ( 'employer' === $role ) update_user_meta( $uid, 'jr_contact_name', $name );
		wp_mail( $email, 'Welcome to ' . get_bloginfo( 'name' ), 'Hi ' . $parts[0] . ",\n\nYour " . get_bloginfo( 'name' ) . ' ' . ( 'employer' === $role ? 'employer ' : '' ) . "account is ready. Sign in on the website or in the JobsRack app with this email.\n\n" . ( 'employer' === $role ? "Posting jobs is free.\n\n" : '' ) . get_bloginfo( 'name' ) . "\n" );
		wp_mail( 'support@jobsrack.com', 'New ' . $role . ' sign-up from the app: ' . ( 'employer' === $role ? $co : $name ), "Name: $name\nEmail: $email\nPhone: $phone\n" . ( 'employer' === $role ? "Company: $co\n" : '' ) . 'Site: ' . home_url() . "\n" );
		return array( 'token' => jr19_issue_token( $uid ), 'user' => jr19_user( $uid ) );
	}, $pub );

	$reg( '/auth/forgot', 'POST', function ( WP_REST_Request $r ) {
		if ( ! jr19_rate( 'forgot', 6 ) ) return jr19_err( 'Too many requests. Please try again later.', 429 );
		$email = sanitize_email( (string) $r->get_param( 'email' ) );
		if ( is_email( $email ) && email_exists( $email ) && function_exists( 'retrieve_password' ) ) retrieve_password( get_user_by( 'email', $email )->user_login );
		return array( 'ok' => true, 'message' => 'If there is an account with that email, we have sent a link to set a new password. Please check your inbox and spam folder.' );
	}, $pub );

	$reg( '/auth/logout', 'POST', function () {
		$raw = jr19_raw_token();
		$uid = get_current_user_id();
		$l   = get_user_meta( $uid, 'jr19_tokens', true );
		if ( is_array( $l ) ) { unset( $l[ jr19_tok_hash( $raw ) ] ); update_user_meta( $uid, 'jr19_tokens', $l ); }
		return array( 'ok' => true );
	}, 'jr19_auth' );

	$reg( '/me', 'GET', function () { return jr19_user( wp_get_current_user() ); }, 'jr19_auth' );

	$reg( '/me', 'POST', function ( WP_REST_Request $r ) {
		$u   = wp_get_current_user();
		$emp = 'employer' === jr19_role( $u );
		$p   = $r->get_params();
		$upd = array( 'ID' => $u->ID );
		if ( isset( $p['name'] ) && mb_strlen( trim( $p['name'] ) ) >= 2 ) {
			$n = sanitize_text_field( $p['name'] );
			if ( $emp ) update_user_meta( $u->ID, 'jr_contact_name', $n ); else $upd['display_name'] = $n;
		}
		if ( $emp && isset( $p['company'] ) && mb_strlen( trim( $p['company'] ) ) >= 2 ) $upd['display_name'] = sanitize_text_field( $p['company'] );
		if ( isset( $p['website'] ) ) $upd['user_url'] = esc_url_raw( (string) $p['website'] );
		if ( isset( $p['about'] ) ) $upd['description'] = sanitize_textarea_field( (string) $p['about'] );
		wp_update_user( $upd );
		if ( isset( $p['phone'] ) ) update_user_meta( $u->ID, 'cs_phone_number', preg_replace( '/[^0-9+()\- ]/', '', (string) $p['phone'] ) );
		if ( isset( $p['city'] ) ) update_user_meta( $u->ID, 'jr_city', sanitize_text_field( (string) $p['city'] ) );
		if ( isset( $p['headline'] ) ) update_user_meta( $u->ID, 'jr_headline', sanitize_text_field( (string) $p['headline'] ) );
		$cv = jr19_upload_resume( 'resume' );
		if ( is_wp_error( $cv ) ) return $cv;
		if ( $cv ) update_user_meta( $u->ID, 'cs_candidate_cv', $cv );
		if ( ! $emp ) {
			update_user_meta( $u->ID, 'cs_user_last_activity_date', time() );
			// A complete profile is searchable by employers unless the person turned it off on the website.
			if ( 'no' === get_user_meta( $u->ID, 'cs_allow_search', true ) && get_user_meta( $u->ID, 'jr_guest', true ) && ( get_user_meta( $u->ID, 'jr_headline', true ) ) ) update_user_meta( $u->ID, 'cs_allow_search', 'yes' );
		}
		return jr19_user( $u->ID );
	}, 'jr19_auth' );

	$reg( '/me/delete', 'POST', function () {
		$u = wp_get_current_user();
		if ( user_can( $u, 'manage_options' ) ) return jr19_err( 'Admin accounts cannot be deleted from the app.' );
		$info = $u->display_name . ' <' . $u->user_email . '> (' . jr19_role( $u ) . ', user #' . $u->ID . ') on ' . home_url();
		if ( 'employer' === jr19_role( $u ) ) {
			update_user_meta( $u->ID, 'jr19_tokens', array() );
			wp_mail( 'support@jobsrack.com', 'Account deletion request (employer, from app)', "Please delete this employer account and its jobs:\n\n$info\n" );
			return array( 'ok' => true, 'message' => 'We have received your request. Your employer account and jobs will be deleted within 7 days, and we will email you when it is done.' );
		}
		require_once ABSPATH . 'wp-admin/includes/user.php';
		wp_delete_user( $u->ID );
		wp_mail( 'support@jobsrack.com', 'Account deleted from the app', "Deleted: $info\n" );
		return array( 'ok' => true, 'message' => 'Your account and your data have been deleted.' );
	}, 'jr19_auth' );

	$reg( '/me/applications', 'GET', function () {
		$uid  = get_current_user_id();
		$list = get_user_meta( $uid, 'cs-user-jobs-applied-list', true );
		$out  = array();
		foreach ( array_reverse( is_array( $list ) ? $list : array() ) as $row ) {
			$job = (int) ( $row['post_id'] ?? 0 );
			if ( ! $job || 'jobs' !== get_post_type( $job ) ) continue;
			$out[] = array( 'job' => jr19_card( $job ), 'applied' => (int) ( $row['date_time'] ?? 0 ), 'status' => jr19_app_status( $uid, $job ) );
		}
		return $out;
	}, 'jr19_auth' );

	// Apply with the resume saved on the profile (signed-in job seekers)
	$reg( '/me/apply', 'POST', function ( WP_REST_Request $r ) {
		$uid = get_current_user_id();
		$job = (int) $r->get_param( 'job' );
		if ( 'employer' === jr19_role( wp_get_current_user() ) ) return jr19_err( 'Employer accounts cannot apply to jobs.' );
		if ( 'jobs' !== get_post_type( $job ) || 'publish' !== get_post_status( $job ) ) return jr19_err( 'This job is no longer available.' );
		if ( in_array( $job, jr19_applied_ids( $uid ), true ) ) return jr19_err( 'You have already applied for this job.' );
		$cv = (string) get_user_meta( $uid, 'cs_candidate_cv', true );
		if ( '' === $cv ) return jr19_err( 'Please add your resume first.' );
		$ans = (array) $r->get_param( 'answers' );
		if ( function_exists( 'jr_sq_get' ) ) { foreach ( (array) jr_sq_get( $job ) as $i => $q ) { if ( '' === trim( (string) ( $ans[ $i ] ?? '' ) ) ) return jr19_err( "Please answer all the employer's questions." ); } }
		if ( ! jr19_rate( 'apply' . $uid, 30 ) ) return jr19_err( 'Too many applications. Please try again later.', 429 );
		$cover = sanitize_textarea_field( (string) $r->get_param( 'cover' ) );
		update_user_meta( $uid, 'cs_candidate_cv_' . $job . ' ', $cv );
		update_user_meta( $uid, 'jr_app_cv_' . $job, $cv );
		if ( '' !== $cover ) update_user_meta( $uid, 'cs_updated_cover_letter_' . $job . ' ', $cover );
		$list = jr19_applied_ids( $uid ); $list[] = $job;
		update_user_meta( $uid, 'cs-jobs-applied', array_values( array_unique( array_map( 'strval', $list ) ) ) );
		if ( function_exists( 'cs_create_user_meta_list' ) ) cs_create_user_meta_list( $job, 'cs-user-jobs-applied-list', $uid );
		if ( function_exists( 'cs_update_job_application_status' ) ) cs_update_job_application_status( $job, $uid );
		$_POST['post_id'] = $job;
		$_POST['jr_q']    = $ans;
		do_action( 'jobhunt_applied_multi_jobs', $job, $uid );
		do_action( 'jobhunt_user_job_applied', $_POST, $uid );
		$emp  = function_exists( 'cs_get_user_id_by_login' ) ? cs_get_user_id_by_login( get_post_meta( $job, 'cs_job_username', true ) ) : 0;
		$atts = array( 'candidate_id' => $uid, 'job_id' => $job, 'user_id' => $emp );
		do_action( 'job_applied_candidate_notification', $atts );
		$spec = apply_filters( 'jobhunt_employer_notification_get_email', $job );
		if ( $spec && $spec !== $job ) $atts['emp_spec_job_email'] = $spec;
		do_action( 'job_applied_employer_notification', $atts );
		return array( 'ok' => true, 'msg' => 'Application sent! We emailed you a confirmation.' );
	}, 'jr19_auth' );

	/* Messages */
	$reg( '/messages', 'GET', function () {
		global $wpdb;
		$uid  = get_current_user_id();
		$keys = $wpdb->get_col( $wpdb->prepare( "SELECT pm.meta_value FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key = 'jr_thread' JOIN {$wpdb->postmeta} a ON a.post_id = p.ID AND a.meta_key IN ('jr_cand','jr_emp') AND a.meta_value = %d WHERE p.post_type = 'jr_msg' GROUP BY pm.meta_value ORDER BY MAX(p.post_date_gmt) DESC LIMIT 100", $uid ) );
		$out  = array();
		foreach ( $keys as $k ) { if ( jr19_thread_parties( $k ) ) $out[] = jr19_thread_info( $k, $uid ); }
		return $out;
	}, 'jr19_auth' );

	$reg( '/messages', 'POST', function ( WP_REST_Request $r ) {
		$uid  = get_current_user_id();
		$to   = (int) $r->get_param( 'to' );
		$job  = (int) $r->get_param( 'job' );
		$text = trim( sanitize_textarea_field( (string) $r->get_param( 'text' ) ) );
		if ( '' === $text ) return jr19_err( 'Write a message first.' );
		if ( 'employer' !== jr19_role( wp_get_current_user() ) ) return jr19_err( 'Only employers can start a conversation.', 403 );
		$cand = get_userdata( $to );
		if ( ! $cand || 'candidate' !== jr19_role( $cand ) ) return jr19_err( 'This person can no longer be contacted.' );
		if ( $job ) {
			if ( ! jr19_owner_ok( $job, $uid ) || ! in_array( $job, jr19_applied_ids( $to ), true ) ) return jr19_err( 'You can only message people who applied to your jobs.', 403 );
			$key = $job . '-' . $to;
		} else {
			$key = 'd' . $uid . '-' . $to;
		}
		$m = jr19_post_msg( $key, $uid, $text );
		return is_wp_error( $m ) ? $m : array( 'id' => $key );
	}, 'jr19_auth' );

	$reg( '/messages/(?P<key>d?\d+-\d+)', 'GET', function ( WP_REST_Request $r ) {
		$uid = get_current_user_id();
		$key = (string) $r['key'];
		if ( ! jr19_can_thread( $key, $uid ) ) return jr19_err( 'You cannot open this conversation.', 403 );
		update_user_meta( $uid, jr19_seen_key( $key ), time() );
		$msgs = array_map( function ( $m ) use ( $uid ) { return array( 'id' => (int) $m->ID, 'mine' => (int) $m->post_author === $uid, 'text' => $m->post_content, 'time' => (int) get_post_time( 'U', true, $m ) ); }, jr19_thread_msgs( $key ) );
		return array( 'thread' => jr19_thread_info( $key, $uid ), 'messages' => $msgs );
	}, 'jr19_auth' );

	$reg( '/messages/(?P<key>d?\d+-\d+)', 'POST', function ( WP_REST_Request $r ) {
		$uid  = get_current_user_id();
		$key  = (string) $r['key'];
		$text = trim( sanitize_textarea_field( (string) $r->get_param( 'text' ) ) );
		if ( '' === $text ) return jr19_err( 'Write a message first.' );
		if ( ! jr19_can_thread( $key, $uid ) ) return jr19_err( 'You cannot reply to this conversation.', 403 );
		if ( ! jr19_thread_msgs( $key ) ) return jr19_err( 'This conversation has not started yet.' );
		return jr19_post_msg( $key, $uid, $text );
	}, 'jr19_auth' );

	/* Explore */
	$reg( '/salaries', 'GET', function ( WP_REST_Request $r ) {
		if ( ! function_exists( 'jr3_jobs' ) || ! function_exists( 'jr3_stats' ) || 'gl' === jr19_site() ) return array();
		$q  = strtolower( trim( (string) $r->get_param( 'q' ) ) );
		$by = array();
		foreach ( jr3_jobs() as $row ) { if ( '' !== $row['n'] && ( '' === $q || false !== strpos( strtolower( $row['n'] ), $q ) ) ) $by[ $row['n'] ][] = $row; }
		$out = array();
		foreach ( $by as $n => $l ) {
			$s = jr3_stats( $l );
			if ( ! $s ) continue;
			$per = 'in' === jr19_site() ? 'month' : 'hour';
			$out[] = array( 'title' => $n, 'avg' => jr3_money( $s['avg'] ) . ' a year (about ' . jr3_money( $s['avg'], $per ) . ' a' . ( 'hour' === $per ? 'n hour' : ' month' ) . ')', 'min' => jr3_money( $s['min'] ), 'max' => jr3_money( $s['max'] ), 'n' => (int) $s['n'] );
		}
		usort( $out, function ( $a, $b ) { return $b['n'] <=> $a['n']; } );
		return array_slice( $out, 0, 80 );
	}, $pub );

	$companies = function () {
		$by = array();
		if ( ! function_exists( 'jr3_jobs' ) ) return $by;
		foreach ( jr3_jobs() as $row ) { if ( '' !== $row['co'] ) $by[ sanitize_title( $row['co'] ) ][] = $row; }
		return $by;
	};
	$reviews = function ( $slug ) {
		return get_posts( array( 'post_type' => 'jr_review', 'post_status' => 'publish', 'posts_per_page' => 50, 'meta_key' => 'jr_co', 'meta_value' => $slug ) );
	};
	$reg( '/companies', 'GET', function ( WP_REST_Request $r ) use ( $companies, $reviews ) {
		$q    = strtolower( trim( (string) $r->get_param( 'q' ) ) );
		$page = max( 1, (int) $r->get_param( 'page' ) );
		$out  = array();
		foreach ( $companies() as $slug => $l ) {
			if ( '' !== $q && false === strpos( strtolower( $l[0]['co'] ), $q ) ) continue;
			$rv  = $reviews( $slug );
			$avg = $rv ? array_sum( array_map( function ( $p ) { return (int) get_post_meta( $p->ID, 'jr_rating', true ); }, $rv ) ) / count( $rv ) : 0;
			$cities = array_values( array_unique( array_filter( array_map( function ( $x ) { return $x['c']; }, $l ) ) ) );
			$out[] = array( 'id' => $slug, 'name' => html_entity_decode( $l[0]['co'], ENT_QUOTES ), 'city' => $cities[0] ?? '', 'jobs' => count( $l ), 'rating' => round( $avg, 1 ), 'reviews' => count( $rv ) );
		}
		usort( $out, function ( $a, $b ) { return $b['jobs'] <=> $a['jobs'] ?: strcmp( $a['name'], $b['name'] ); } );
		return array( 'items' => array_slice( $out, ( $page - 1 ) * 50, 50 ), 'pages' => (int) ceil( count( $out ) / 50 ) );
	}, $pub );
	$reg( '/company-lookup', 'GET', function ( WP_REST_Request $r ) { return array( 'id' => sanitize_title( (string) $r->get_param( 'name' ) ) ); }, $pub );
	$reg( '/company/(?P<slug>[a-z0-9-]+)', 'GET', function ( WP_REST_Request $r ) use ( $companies, $reviews ) {
		$slug = (string) $r['slug'];
		$all  = $companies();
		if ( ! isset( $all[ $slug ] ) ) return jr19_err( 'This company has no open jobs right now.', 404 );
		$l = $all[ $slug ];
		usort( $l, function ( $a, $b ) { return $b['d'] <=> $a['d']; } );
		$rv     = $reviews( $slug );
		$avg    = $rv ? array_sum( array_map( function ( $p ) { return (int) get_post_meta( $p->ID, 'jr_rating', true ); }, $rv ) ) / count( $rv ) : 0;
		$owner  = function_exists( 'jr3_job_owner_id' ) ? get_userdata( jr3_job_owner_id( $l[0]['id'] ) ) : null;
		$isemp  = $owner && 'employer' === jr19_role( $owner ) && ! user_can( $owner, 'manage_options' ) && ! get_user_meta( $owner->ID, 'jr_house_account', true );
		$cities = array_values( array_unique( array_filter( array_map( function ( $x ) { return $x['c']; }, $l ) ) ) );
		return array(
			'id' => $slug, 'name' => html_entity_decode( $l[0]['co'], ENT_QUOTES ), 'city' => $cities[0] ?? '', 'jobs' => count( $l ), 'rating' => round( $avg, 1 ), 'reviews' => count( $rv ),
			'about' => $isemp ? wpautop( esc_html( $owner->description ) ) : '', 'website' => $isemp ? (string) $owner->user_url : '',
			'jobs_list' => array_map( function ( $x ) { return jr19_card( $x['id'] ); }, array_slice( $l, 0, 40 ) ),
			'review_list' => array_map( function ( $p ) { return array( 'stars' => (int) get_post_meta( $p->ID, 'jr_rating', true ), 'title' => $p->post_title, 'text' => wp_strip_all_tags( $p->post_content ), 'time' => (int) get_post_time( 'U', true, $p ) ); }, $rv ),
		);
	}, $pub );

	$reg( '/posts', 'GET', function ( WP_REST_Request $r ) {
		$q = new WP_Query( array( 'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => 20, 'paged' => max( 1, (int) $r->get_param( 'page' ) ) ) );
		return array( 'pages' => (int) $q->max_num_pages, 'items' => array_map( function ( $p ) { return array( 'id' => $p->ID, 'title' => html_entity_decode( get_the_title( $p ), ENT_QUOTES ), 'excerpt' => html_entity_decode( wp_trim_words( wp_strip_all_tags( strip_shortcodes( $p->post_excerpt ?: $p->post_content ) ), 30 ), ENT_QUOTES ), 'image' => (string) get_the_post_thumbnail_url( $p, 'medium_large' ), 'time' => (int) get_post_time( 'U', true, $p ) ); }, $q->posts ) );
	}, $pub );
	$reg( '/post/(?P<id>\d+)', 'GET', function ( WP_REST_Request $r ) {
		$p = get_post( (int) $r['id'] );
		if ( ! $p || 'post' !== $p->post_type || 'publish' !== $p->post_status ) return jr19_err( 'This article is not available.', 404 );
		return array( 'id' => $p->ID, 'title' => html_entity_decode( get_the_title( $p ), ENT_QUOTES ), 'excerpt' => '', 'image' => (string) get_the_post_thumbnail_url( $p, 'large' ), 'time' => (int) get_post_time( 'U', true, $p ), 'content' => wpautop( strip_shortcodes( $p->post_content ) ) );
	}, $pub );
	$reg( '/page/(?P<slug>[a-z0-9-]+)', 'GET', function ( WP_REST_Request $r ) {
		$slug = (string) $r['slug'];
		$p    = get_page_by_path( $slug );
		if ( ! $p && 'privacy-policy' === $slug ) $p = get_post( (int) get_option( 'wp_page_for_privacy_policy' ) );
		if ( ! $p && in_array( $slug, array( 'terms-and-policies', 'terms-of-use' ), true ) ) $p = get_page_by_path( 'terms-of-use' ) ?: get_page_by_path( 'terms-and-policies' ) ?: get_page_by_path( 'terms-and-conditions' ) ?: get_page_by_path( 'terms' );
		if ( ! $p || 'publish' !== $p->post_status ) return jr19_err( 'This page is not available.', 404 );
		return array( 'title' => html_entity_decode( get_the_title( $p ), ENT_QUOTES ), 'content' => wpautop( strip_shortcodes( $p->post_content ) ) );
	}, $pub );
	$reg( '/contact', 'POST', function ( WP_REST_Request $r ) {
		if ( ! jr19_rate( 'contact', 5 ) ) return jr19_err( 'Too many messages. Please try again later.', 429 );
		$name  = sanitize_text_field( (string) $r->get_param( 'name' ) );
		$email = sanitize_email( (string) $r->get_param( 'email' ) );
		$msg   = sanitize_textarea_field( (string) $r->get_param( 'message' ) );
		if ( mb_strlen( $name ) < 2 || ! is_email( $email ) || mb_strlen( $msg ) < 5 ) return jr19_err( 'Please fill in your name, email and message.' );
		wp_mail( 'support@jobsrack.com', 'App contact form: ' . $name, "From: $name <$email>\nSite: " . home_url() . "\n\n$msg\n", array( 'Reply-To: ' . $name . ' <' . $email . '>' ) );
		return array( 'ok' => true, 'message' => 'Thanks, we got your message and will reply to ' . $email . ' soon.' );
	}, $pub );

	/* Employer tools */
	$reg( '/taxonomies', 'GET', function () {
		$s     = jr19_site();
		$types = get_terms( array( 'taxonomy' => 'job_type', 'hide_empty' => false ) );
		$keep  = array( 'Full Time', 'Part Time', 'Permanent', 'Contract', 'Temporary', 'Casual', 'Seasonal', 'Internship', 'Freelance', 'Remote', 'Hybrid' );
		$types = array_values( array_filter( is_array( $types ) ? $types : array(), function ( $t ) use ( $keep ) { return in_array( html_entity_decode( $t->name ), $keep, true ); } ) );
		$cats  = get_terms( array( 'taxonomy' => 'specialisms', 'hide_empty' => true, 'orderby' => 'count', 'order' => 'DESC', 'number' => 30 ) );
		$cats  = is_array( $cats ) ? $cats : array();
		usort( $cats, function ( $a, $b ) { return strcmp( $a->name, $b->name ); } );
		$map = function ( $t ) { return array( 'id' => (int) $t->term_id, 'name' => html_entity_decode( $t->name, ENT_QUOTES ) ); };
		return array( 'types' => array_map( $map, $types ), 'categories' => array_map( $map, $cats ), 'periods' => 'in' === $s ? array( 'month', 'year' ) : array( 'hour', 'year' ), 'currency' => array( 'ca' => 'CAD', 'in' => 'INR', 'au' => 'AUD', 'gl' => 'USD' )[ $s ], 'ontario' => 'ca' === $s );
	}, $pub );

	$reg( '/employer/jobs', 'GET', function () {
		$u   = wp_get_current_user();
		$ids = get_posts( array( 'post_type' => 'jobs', 'post_status' => array( 'publish', 'pending', 'draft' ), 'posts_per_page' => 200, 'fields' => 'ids', 'meta_key' => 'cs_job_username', 'meta_value' => $u->user_login, 'orderby' => 'date', 'order' => 'DESC' ) );
		return array_map( function ( $id ) {
			$st  = (string) get_post_meta( $id, 'cs_job_status', true );
			$exp = (int) get_post_meta( $id, 'cs_job_expired', true );
			$s   = 'active' === $st ? ( $exp && $exp < time() ? 'expired' : 'active' ) : ( 'awaiting-activation' === $st ? 'pending' : 'closed' );
			$c   = jr19_card( $id );
			return array( 'id' => $id, 'title' => $c['title'], 'city' => $c['city'], 'status' => $s, 'posted' => $c['posted'], 'expires' => $exp, 'applicants' => count( jr19_applicant_ids( $id ) ), 'views' => (int) get_post_meta( $id, 'cs_count_views', true ), 'pay' => $c['pay'] );
		}, $ids );
	}, 'jr19_emp_auth' );

	$form_out = function ( $id ) {
		$types = wp_get_object_terms( $id, 'job_type', array( 'fields' => 'ids' ) );
		$cats  = wp_get_object_terms( $id, 'specialisms', array( 'fields' => 'ids' ) );
		$on    = get_post_meta( $id, 'jr_ontario', true );
		$st    = (string) get_post_meta( $id, 'cs_job_status', true );
		return array(
			'id' => $id, 'status' => 'active' === $st ? 'active' : ( 'awaiting-activation' === $st ? 'pending' : 'closed' ),
			'title' => html_entity_decode( get_the_title( $id ), ENT_QUOTES ), 'description' => wp_strip_all_tags( str_replace( array( '</p>', '<br>', '<br />', '</li>' ), "\n", get_post_field( 'post_content', $id ) ) ),
			'city' => (string) get_post_meta( $id, '6', true ), 'type' => (int) ( $types[0] ?? 0 ), 'category' => (int) ( $cats[0] ?? 0 ),
			'pay_min' => (string) get_post_meta( $id, 'jr_pay_min', true ), 'pay_max' => (string) get_post_meta( $id, 'jr_pay_max', true ), 'pay_period' => (string) ( get_post_meta( $id, 'jr_pay_period', true ) ?: 'year' ),
			'apply_email' => (string) get_post_meta( $id, 'jr_apply_email', true ), 'openings' => (string) ( get_post_meta( $id, 'jr_openings_n', true ) ?: '1' ),
			'vacancy' => is_array( $on ) ? ( $on['vac'] ?? '' ) : '', 'ai' => is_array( $on ) ? ( $on['ai'] ?? '' ) : '',
		);
	};
	$reg( '/employer/jobs/(?P<id>\d+)', 'GET', function ( WP_REST_Request $r ) use ( $form_out ) {
		$id = (int) $r['id'];
		if ( ! jr19_owner_ok( $id, get_current_user_id() ) ) return jr19_err( 'This is not one of your jobs.', 403 );
		return $form_out( $id );
	}, 'jr19_emp_auth' );

	$save = function ( WP_REST_Request $r ) {
		$u  = wp_get_current_user();
		$id = (int) ( $r['id'] ?? 0 );
		if ( $id && ! jr19_owner_ok( $id, $u->ID ) ) return jr19_err( 'This is not one of your jobs.', 403 );
		if ( ! $id && ! jr19_rate( 'post' . $u->ID, 20, DAY_IN_SECONDS ) ) return jr19_err( 'You have posted a lot of jobs today. Please try again tomorrow or contact us.', 429 );
		$s      = jr19_site();
		$title  = sanitize_text_field( (string) $r->get_param( 'title' ) );
		$desc   = sanitize_textarea_field( (string) $r->get_param( 'description' ) );
		$city   = jr19_city( $r->get_param( 'city' ) );
		$type   = (int) $r->get_param( 'type' );
		$cat    = (int) $r->get_param( 'category' );
		$min    = (float) preg_replace( '/[^\d.]/', '', (string) $r->get_param( 'pay_min' ) );
		$max    = (float) preg_replace( '/[^\d.]/', '', (string) $r->get_param( 'pay_max' ) );
		$per    = in_array( $r->get_param( 'pay_period' ), array( 'hour', 'month', 'year' ), true ) ? $r->get_param( 'pay_period' ) : 'year';
		$emails = array_filter( array_map( 'sanitize_email', preg_split( '/[\s,;]+/', (string) $r->get_param( 'apply_email' ) ) ), 'is_email' );
		$open   = max( 1, min( 999, (int) $r->get_param( 'openings' ) ) );
		if ( mb_strlen( $title ) < 3 ) return jr19_err( 'Please enter the job title.' );
		if ( '' === $city ) return jr19_err( 'Please enter the city.' );
		if ( ! $min || ! $max || $max < $min ) return jr19_err( 'Please enter a valid pay range.' );
		if ( mb_strlen( $desc ) < 80 ) return jr19_err( 'Please describe the job in a few more lines.' );
		if ( ! $emails ) return jr19_err( 'Please enter the email where applications should go.' );
		$cur  = 'in' === $s ? '₹' : '$';
		$fmt  = function ( $n ) use ( $s, $per ) { return 'in' === $s ? number_format( $n ) : ( 'hour' === $per ? number_format( $n, 2 ) : number_format( $n ) ); };
		$pay  = $cur . $fmt( $min ) . ' to ' . $cur . $fmt( $max ) . ' ' . array( 'hour' => 'an hour', 'month' => 'a month', 'year' => 'a year' )[ $per ];
		$html = wpautop( esc_html( $desc ) );
		$co   = html_entity_decode( $u->display_name, ENT_QUOTES );
		$now  = time();
		$data = array( 'post_type' => 'jobs', 'post_title' => $title, 'post_content' => $html, 'post_status' => 'publish', 'post_author' => $u->ID );
		if ( $id ) { $data['ID'] = $id; $id = wp_update_post( $data, true ); } else { $id = wp_insert_post( $data, true ); $new = true; }
		if ( is_wp_error( $id ) ) return jr19_err( 'We could not save the job. Please try again.' );
		if ( ! empty( $new ) ) {
			$exp = $now + 30 * DAY_IN_SECONDS;
			update_post_meta( $id, 'cs_job_username', $u->user_login );
			update_post_meta( $id, 'cs_job_status', 'active' );
			update_post_meta( $id, 'cs_job_posted', $now );
			update_post_meta( $id, 'cs_job_expired', $exp );
			update_post_meta( $id, 'cs_application_closing_date', $exp );
			update_post_meta( $id, 'cs_job_featured', 'no' );
			update_post_meta( $id, 'cs_count_views', 0 );
			update_post_meta( $id, 'jr_app_posted', 1 );
			$arr = array( 'cs_job_id' => '', 'cs_trans_id' => '', 'cs_job_username' => $u->user_login, 'cs_job_posted' => $now, 'cs_job_expired' => $exp, 'cs_application_closing_date' => gmdate( 'd-m-Y', $exp ), 'cs_external_url_id' => '', 'cs_job_featured' => 'no', 'cs_job_package' => '', 'cs_job_status' => 'active' );
			update_post_meta( $id, 'cs_full_data', $arr );
			update_post_meta( $id, 'cs_array_data', $arr );
		}
		update_post_meta( $id, 'cs_post_loc_country', array( 'ca' => 'canada', 'in' => 'india', 'au' => 'australia', 'gl' => '' )[ $s ] );
		update_post_meta( $id, 'cs_post_comp_address', $city );
		update_post_meta( $id, '1', $co );
		update_post_meta( $id, '6', $city );
		update_post_meta( $id, '4', $pay );
		update_post_meta( $id, 'jr_pay_min', $min );
		update_post_meta( $id, 'jr_pay_max', $max );
		update_post_meta( $id, 'jr_pay_period', $per );
		update_post_meta( $id, 'jr_apply_email', implode( ', ', $emails ) );
		update_post_meta( $id, 'jr_openings_n', $open );
		update_post_meta( $id, 'jr_openings', $open >= 10 ? '10+' : ( $open >= 5 ? '5-10' : ( $open >= 2 ? '2-4' : '1' ) ) );
		if ( 'ca' === $s ) update_post_meta( $id, 'jr_ontario', array( 'vac' => in_array( $r->get_param( 'vacancy' ), array( 'yes', 'no' ), true ) ? $r->get_param( 'vacancy' ) : '', 'ai' => in_array( $r->get_param( 'ai' ), array( 'yes', 'no' ), true ) ? $r->get_param( 'ai' ) : '', 'cexp' => 0 ) );
		if ( $type ) wp_set_object_terms( $id, array( $type ), 'job_type' );
		if ( $cat ) wp_set_object_terms( $id, array( $cat ), 'specialisms' );
		$names = array_merge( array( $title ), wp_get_object_terms( $id, 'specialisms', array( 'fields' => 'names' ) ), wp_get_object_terms( $id, 'job_type', array( 'fields' => 'names' ) ), array( ucfirst( (string) get_post_meta( $id, 'cs_post_loc_country', true ) ), $city, $co, $pay, $city ) );
		update_post_meta( $id, 'cs_job_search_data', serialize( array_values( array_filter( $names ) ) ) );
		if ( function_exists( 'jr_pay_store' ) ) jr_pay_store( $id );
		delete_transient( 'jr3_jobs_v3' );
		if ( ! empty( $new ) ) wp_mail( 'support@jobsrack.com', 'New job posted from the app: ' . $title, "Employer: $co (" . $u->user_email . ")\nJob: $title\nCity: $city\nPay: $pay\nLink: " . get_permalink( $id ) . "\nEdit: " . admin_url( 'post.php?post=' . $id . '&action=edit' ) . "\n" );
		return array( 'id' => (int) $id, 'status' => 'active', 'message' => ! empty( $new ) ? 'Your job is live on JobsRack. Applications will be emailed to ' . implode( ', ', $emails ) . ' and show in the app.' : 'Your changes are saved.' );
	};
	$reg( '/employer/jobs', 'POST', $save, 'jr19_emp_auth' );
	$reg( '/employer/jobs/(?P<id>\d+)', 'POST', $save, 'jr19_emp_auth' );

	$reg( '/employer/jobs/(?P<id>\d+)/status', 'POST', function ( WP_REST_Request $r ) {
		$id = (int) $r['id'];
		if ( ! jr19_owner_ok( $id, get_current_user_id() ) ) return jr19_err( 'This is not one of your jobs.', 403 );
		if ( 'closed' === $r->get_param( 'status' ) ) {
			update_post_meta( $id, 'cs_job_status', 'inactive' );
		} else {
			update_post_meta( $id, 'cs_job_status', 'active' );
			if ( (int) get_post_meta( $id, 'cs_job_expired', true ) < time() + DAY_IN_SECONDS ) { $e = time() + 30 * DAY_IN_SECONDS; update_post_meta( $id, 'cs_job_expired', $e ); update_post_meta( $id, 'cs_application_closing_date', $e ); }
		}
		delete_transient( 'jr3_jobs_v3' );
		return array( 'ok' => true, 'status' => 'closed' === $r->get_param( 'status' ) ? 'closed' : 'active' );
	}, 'jr19_emp_auth' );

	$reg( '/employer/jobs/(?P<id>\d+)/applicants', 'GET', function ( WP_REST_Request $r ) {
		$job = (int) $r['id'];
		if ( ! jr19_owner_ok( $job, get_current_user_id() ) ) return jr19_err( 'This is not one of your jobs.', 403 );
		$out = array();
		foreach ( jr19_applicant_ids( $job ) as $uid ) {
			$u = get_userdata( $uid );
			if ( ! $u ) continue;
			$when = 0;
			foreach ( (array) get_user_meta( $uid, 'cs-user-jobs-applied-list', true ) as $row ) { if ( (int) ( $row['post_id'] ?? 0 ) === $job ) $when = (int) ( $row['date_time'] ?? 0 ); }
			$sc  = get_user_meta( $uid, 'jr_screen_' . $job, true );
			$cv  = (string) ( get_user_meta( $uid, 'jr_app_cv_' . $job, true ) ?: get_user_meta( $uid, 'cs_candidate_cv_' . $job . ' ', true ) ?: get_user_meta( $uid, 'cs_candidate_cv', true ) );
			$out[] = array(
				'id' => $uid, 'user_id' => $uid, 'name' => html_entity_decode( $u->display_name, ENT_QUOTES ), 'email' => $u->user_email,
				'phone' => (string) get_user_meta( $uid, 'cs_phone_number', true ), 'city' => (string) get_user_meta( $uid, 'jr_city', true ),
				'cover' => (string) get_user_meta( $uid, 'cs_updated_cover_letter_' . $job . ' ', true ),
				'answers' => is_array( $sc ) && ! empty( $sc['rows'] ) ? array_map( function ( $x ) { return array( 'q' => $x['q'], 'a' => ucfirst( (string) $x['a'] ) ); }, $sc['rows'] ) : array(),
				'resume_url' => $cv, 'applied' => $when, 'status' => jr19_app_status( $uid, $job ),
			);
		}
		usort( $out, function ( $a, $b ) { return $b['applied'] <=> $a['applied']; } );
		return $out;
	}, 'jr19_emp_auth' );

	$reg( '/employer/jobs/(?P<id>\d+)/applicants/(?P<uid>\d+)', 'POST', function ( WP_REST_Request $r ) {
		$job = (int) $r['id'];
		$uid = (int) $r['uid'];
		if ( ! jr19_owner_ok( $job, get_current_user_id() ) || ! in_array( $job, jr19_applied_ids( $uid ), true ) ) return jr19_err( 'This applicant is not on one of your jobs.', 403 );
		$s = (string) $r->get_param( 'status' );
		update_user_meta( $uid, 'cs_job_application_status_' . $job, 'shortlisted' === $s ? 'shortlisted' : ( 'rejected' === $s ? 'rejected' : '' ) );
		return array( 'ok' => true );
	}, 'jr19_emp_auth' );

	$reg( '/employer/candidates', 'GET', function ( WP_REST_Request $r ) {
		global $wpdb;
		$q    = trim( sanitize_text_field( (string) $r->get_param( 'q' ) ) );
		$loc  = trim( sanitize_text_field( (string) $r->get_param( 'loc' ) ) );
		$page = max( 1, (int) $r->get_param( 'page' ) );
		$cap  = $wpdb->prefix . 'capabilities';
		$sql  = "SELECT DISTINCT u.ID FROM {$wpdb->users} u JOIN {$wpdb->usermeta} c ON c.user_id = u.ID AND c.meta_key = '$cap' AND c.meta_value LIKE '%cs_candidate%'
			LEFT JOIN {$wpdb->usermeta} s ON s.user_id = u.ID AND s.meta_key = 'cs_allow_search'
			LEFT JOIN {$wpdb->usermeta} h ON h.user_id = u.ID AND h.meta_key = 'jr_headline'
			LEFT JOIN {$wpdb->usermeta} cv ON cv.user_id = u.ID AND cv.meta_key = 'cs_candidate_cv'
			LEFT JOIN {$wpdb->usermeta} ci ON ci.user_id = u.ID AND ci.meta_key = 'jr_city'
			LEFT JOIN {$wpdb->usermeta} d ON d.user_id = u.ID AND d.meta_key = 'description'
			WHERE ( s.meta_value IS NULL OR s.meta_value <> 'no' ) AND ( ( h.meta_value IS NOT NULL AND h.meta_value <> '' ) OR ( cv.meta_value IS NOT NULL AND cv.meta_value <> '' ) )";
		$args = array();
		if ( '' !== $q ) { $sql .= ' AND ( h.meta_value LIKE %s OR d.meta_value LIKE %s OR u.display_name LIKE %s )'; $like = '%' . $wpdb->esc_like( $q ) . '%'; array_push( $args, $like, $like, $like ); }
		if ( '' !== $loc ) { $sql .= ' AND ci.meta_value LIKE %s'; $args[] = '%' . $wpdb->esc_like( $loc ) . '%'; }
		$sql .= ' ORDER BY u.ID DESC LIMIT 400';
		$ids  = $wpdb->get_col( $args ? $wpdb->prepare( $sql, $args ) : $sql );
		$tot  = count( $ids );
		$ids  = array_slice( $ids, ( $page - 1 ) * 20, 20 );
		return array( 'total' => $tot, 'pages' => (int) ceil( $tot / 20 ), 'items' => array_map( function ( $id ) {
			$u = get_userdata( $id );
			return array( 'id' => (int) $id, 'name' => html_entity_decode( $u->display_name, ENT_QUOTES ), 'headline' => (string) get_user_meta( $id, 'jr_headline', true ), 'city' => (string) get_user_meta( $id, 'jr_city', true ), 'updated' => (int) ( get_user_meta( $id, 'user_last_login', true ) ?: get_user_meta( $id, 'cs_user_last_activity_date', true ) ?: strtotime( $u->user_registered ) ) );
		}, $ids ) );
	}, 'jr19_emp_auth' );

	$reg( '/employer/candidates/(?P<id>\d+)', 'GET', function ( WP_REST_Request $r ) {
		$u = get_userdata( (int) $r['id'] );
		if ( ! $u || 'candidate' !== jr19_role( $u ) || 'no' === get_user_meta( $u->ID, 'cs_allow_search', true ) ) return jr19_err( 'This candidate is not available.', 404 );
		return array(
			'id' => (int) $u->ID, 'name' => html_entity_decode( $u->display_name, ENT_QUOTES ), 'headline' => (string) get_user_meta( $u->ID, 'jr_headline', true ), 'city' => (string) get_user_meta( $u->ID, 'jr_city', true ),
			'updated' => (int) get_user_meta( $u->ID, 'user_last_login', true ), 'email' => $u->user_email, 'phone' => (string) get_user_meta( $u->ID, 'cs_phone_number', true ),
			'about' => (string) $u->description, 'resume_url' => (string) get_user_meta( $u->ID, 'cs_candidate_cv', true ),
		);
	}, 'jr19_emp_auth' );
} );
