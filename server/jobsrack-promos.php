// JobsRack: site promos — "AI Resume Builder" in the main menu, a homepage banner,
// "No resume? Make one with AI" next to Apply on job pages, and an app strip above the footer
// ("coming soon" with a notify-me signup, or a Google Play button once the app is public).

function jr22_price() { return function_exists( 'jr20_price_label' ) && function_exists( 'jr20_paid' ) && jr20_paid() ? jr20_price_label() : ''; }
function jr22_app_live() { return 'yes' === get_option( 'jr22_app_live', 'no' ); }
function jr22_play_url() { return 'https://play.google.com/store/apps/details?id=com.jobsrack.app'; }

/* ---------- 1. Main menu item ---------- */
add_filter( 'wp_nav_menu_items', function ( $items ) {
	if ( is_admin() || ( false === strpos( $items, '/jobs/' ) && false === strpos( $items, '/about-us/' ) ) || false !== strpos( $items, 'jr22-nav' ) ) return $items;
	$li = '<li class="menu-item jr22-nav"><a href="' . esc_url( home_url( '/resume-builder/' ) ) . '">AI Resume <span class="jr22-new">New</span></a></li>';
	$at = strpos( $items, '/about-us/' );
	if ( false !== $at ) {
		$start = strrpos( substr( $items, 0, $at ), '<li' );
		return substr( $items, 0, $start ) . $li . substr( $items, $start );
	}
	return $items . $li;
}, 20 );

/* ---------- 2–4. Banners (inserted on the page by a small script) ---------- */
add_action( 'wp_footer', function () {
	if ( is_admin() ) return;
	$price = jr22_price();
	$home  = is_front_page();
	$job   = is_singular( 'jobs' );
	$rb    = is_page( 'resume-builder' );
	$live  = jr22_app_live();
	?>
<style>
.jr22-new{display:inline-block;background:#F79009;color:#fff;font-size:10px;font-weight:800;line-height:1;padding:3px 5px;border-radius:4px;margin-left:4px;vertical-align:2px;text-transform:uppercase}
.jr22-hero{max-width:1170px;margin:18px auto;padding:0 15px;box-sizing:border-box}
.jr22-hero a.box{display:flex;align-items:center;gap:16px;background:linear-gradient(90deg,#ECFDF3,#F0F9FF);border:1px solid #ABEFC6;border-radius:14px;padding:16px 20px;text-decoration:none!important;color:#1d2939!important}
.jr22-hero .ic{flex:0 0 auto;width:46px;height:46px;border-radius:12px;background:#1F7A4D;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px}
.jr22-hero b{display:block;font-size:18px;line-height:1.3}.jr22-hero span.s{display:block;color:#475467;font-size:14px;margin-top:2px}
.jr22-hero .go{margin-left:auto;flex:0 0 auto;background:#1F7A4D;color:#fff;border-radius:10px;padding:10px 16px;font-weight:700;font-size:15px;white-space:nowrap}
@media(max-width:640px){.jr22-hero a.box{flex-wrap:wrap}.jr22-hero .go{margin-left:0;width:100%;text-align:center}}
.jr22-cv{margin:10px 0 4px;font-size:14px;color:#475467}.jr22-cv a{color:#1F7A4D!important;font-weight:700}
.jr22-app{background:#101828;color:#fff;padding:18px 15px}
.jr22-app .in{max-width:1170px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.jr22-app .t{flex:1 1 320px;font-size:15px;line-height:1.45}.jr22-app .t b{font-size:17px;display:block}
.jr22-app form{display:flex;gap:8px;flex:1 1 300px;max-width:440px}
.jr22-app input{flex:1;min-width:0;padding:10px 12px;border-radius:8px;border:0;font-size:15px;color:#101828}
.jr22-app button,.jr22-app a.play{background:#12B76A;color:#fff!important;border:0;border-radius:8px;padding:10px 16px;font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap;text-decoration:none!important}
.jr22-app .msg{font-size:14px;color:#A6F4C5;flex-basis:100%}
.jr22-app .x{background:none;border:0;color:#98A2B3;font-size:22px;cursor:pointer;padding:0 4px}
</style>
<script>
(function(){
var price=<?php echo wp_json_encode( $price ); ?>, home=<?php echo $home ? 'true' : 'false'; ?>, job=<?php echo $job ? 'true' : 'false'; ?>, rb=<?php echo $rb ? 'true' : 'false'; ?>, live=<?php echo $live ? 'true' : 'false'; ?>;
var rbUrl=<?php echo wp_json_encode( home_url( '/resume-builder/' ) ); ?>, api=<?php echo wp_json_encode( rest_url( 'jobsrack/v1/app-notify' ) ); ?>, play=<?php echo wp_json_encode( jr22_play_url() ); ?>;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
// Homepage banner
if(home){var m=document.querySelector('.main-section');if(m){var d=document.createElement('div');d.className='jr22-hero';d.innerHTML='<a class="box" href="'+rbUrl+'"><span class="ic">✨</span><span><b>Get a professional resume in 1 minute, written by AI</b><span class="s">Made for the jobs you want, in the format employers expect.'+(price?' Only '+price+'.':' Free.')+'</span></span><span class="go">Make my resume</span></a>';m.parentNode.insertBefore(d,m)}}
// Job pages: next to Apply
if(job){document.querySelectorAll('.apply-buttons, a.jr-apply-top').forEach(function(el,i){if(i>1)return;var d=document.createElement('div');d.className='jr22-cv';d.innerHTML='No resume? <a href="'+rbUrl+'">Make one with AI in a minute →</a>';(el.classList.contains('apply-buttons')?el:el.parentNode).insertAdjacentElement('afterend',d)})}
// App strip above the footer
if(!rb&&ls('jr22_app_x')!=='1'){var f=document.querySelector('footer');if(f){var s=document.createElement('div');s.className='jr22-app';
 s.innerHTML=live?'<div class="in"><div class="t"><b>📱 Get the JobsRack app</b>Search, apply and get alerts for new jobs on your phone. Free.</div><a class="play" href="'+play+'" target="_blank" rel="noopener">Get it on Google Play</a><button class="x" aria-label="Close" type="button">×</button></div>'
 :'<div class="in"><div class="t"><b>📱 The JobsRack app is coming soon to Google Play</b>Job alerts, one-tap apply and a free AI resume builder on your phone. Get an email when it launches.</div><form><input type="email" required placeholder="Your email" aria-label="Your email"><button type="submit">Notify me</button></form><button class="x" aria-label="Close" type="button">×</button><div class="msg"></div></div>';
 f.parentNode.insertBefore(s,f);
 s.querySelector('.x').onclick=function(){s.remove();ls('jr22_app_x','1')};
 var fm=s.querySelector('form');if(fm)fm.onsubmit=function(e){e.preventDefault();var b=fm.querySelector('button'),msg=s.querySelector('.msg');b.disabled=true;
  fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fm.querySelector('input').value})}).then(function(r){return r.json()}).then(function(j){msg.textContent=j.message||'Thanks!';if(j.ok){fm.remove();ls('jr22_app_x','1')}else b.disabled=false}).catch(function(){b.disabled=false;msg.textContent='Please try again.'})}}}
})();
</script>
	<?php
}, 50 );

/* ---------- Notify-me list ---------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'jobsrack/v1', '/app-notify', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $r ) {
		$e = sanitize_email( (string) $r->get_param( 'email' ) );
		if ( ! is_email( $e ) ) return array( 'ok' => false, 'message' => 'Please enter a valid email.' );
		$k = 'jr22_rl_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
		$n = (int) get_transient( $k );
		if ( $n >= 5 ) return array( 'ok' => false, 'message' => 'Please try again later.' );
		set_transient( $k, $n + 1, HOUR_IN_SECONDS );
		$list = get_option( 'jr22_waitlist', array() );
		if ( ! is_array( $list ) ) $list = array();
		$e = strtolower( $e );
		if ( ! isset( $list[ $e ] ) ) { $list[ $e ] = time(); update_option( 'jr22_waitlist', $list, false ); }
		return array( 'ok' => true, 'message' => 'Thanks! We will email you when the app is on Google Play.' );
	} ) );
} );
add_action( 'admin_menu', function () {
	add_options_page( 'JobsRack app', 'JobsRack app', 'manage_options', 'jobsrack-app', function () {
		if ( isset( $_POST['jr22_save'] ) && check_admin_referer( 'jr22' ) ) {
			update_option( 'jr22_app_live', empty( $_POST['jr22_live'] ) ? 'no' : 'yes', false );
			echo '<div class="updated"><p>Saved.</p></div>';
		}
		$list = get_option( 'jr22_waitlist', array() );
		if ( ! is_array( $list ) ) $list = array();
		arsort( $list );
		if ( isset( $_GET['csv'] ) ) {
			echo '<textarea readonly style="width:100%;height:300px">' . esc_textarea( "email,signed_up\n" . implode( "\n", array_map( function ( $e, $t ) { return $e . ',' . gmdate( 'Y-m-d', $t ); }, array_keys( $list ), $list ) ) ) . '</textarea>';
		}
		?>
		<div class="wrap"><h1>JobsRack app</h1>
		<form method="post"><?php wp_nonce_field( 'jr22' ); ?>
		<p><label><input type="checkbox" name="jr22_live" value="1" <?php checked( jr22_app_live() ); ?>> The app is public on Google Play: show the "Get it on Google Play" button instead of "Coming soon"</label></p>
		<p><button class="button button-primary" name="jr22_save" value="1">Save</button></p></form>
		<h2>People waiting for the app: <?php echo count( $list ); ?></h2>
		<p><a class="button" href="<?php echo esc_url( add_query_arg( 'csv', 1 ) ); ?>">Show as CSV</a></p>
		<table class="widefat striped" style="max-width:600px"><thead><tr><th>Email</th><th>Signed up</th></tr></thead><tbody>
		<?php foreach ( array_slice( $list, 0, 200, true ) as $e => $t ) echo '<tr><td>' . esc_html( $e ) . '</td><td>' . esc_html( gmdate( 'M j, Y', $t ) ) . '</td></tr>'; ?>
		</tbody></table></div>
		<?php
	} );
} );


/* ---------- SEO for the new pages ---------- */
function jr22_place() { return array( 'ca' => 'Canada', 'in' => 'India', 'au' => 'Australia', 'gl' => '' )[ function_exists( 'jr21_site' ) ? jr21_site() : 'gl' ] ?? ''; }
function jr22_seo() {
	$in    = jr22_place() ? ' in ' . jr22_place() : '';
	$fmt   = array( 'Canada' => 'Canadian', 'India' => 'Indian', 'Australia' => 'Australian' )[ jr22_place() ] ?? 'professional';
	$price = jr22_price();
	$in_in = 'India' === jr22_place();
	return array(
		'resume-builder'     => array( 'AI Resume Builder' . $in . ': Professional Resume in 1 Minute', 'Make a professional ' . $fmt . ' resume in 1 minute with AI. Upload your old resume or type your details, get an ATS-friendly PDF and apply to jobs' . ( $price ? ' – only ' . $price : '' ) . '.' ),
		'pay-checker'        => array( 'Am I Paid Fairly? Free Pay Checker' . $in, 'Compare your pay with real job ads' . $in . '. See if you are underpaid, the typical pay for your job and better-paying jobs near you. Free and private.' ),
		'no-experience-jobs' => array( ( $in_in ? 'Fresher Jobs' : 'No Experience Jobs' ) . $in . ' – Entry Level Jobs Hiring Now', ( $in_in ? 'Jobs for freshers' : 'Entry-level jobs with no experience needed' ) . $in . '. Trainee and junior roles where employers train you. Apply free in 1 minute.' ),
		'part-time-jobs'     => array( 'Part Time Jobs' . $in . ' – Hiring Now', 'Part-time, casual and flexible-hours jobs' . $in . '. Fit work around study or family. New jobs daily, apply free.' ),
		'remote-jobs'        => array( 'Remote & Work From Home Jobs' . $in, 'Remote, hybrid and work from home jobs' . $in . '. New jobs every day from real employers. Apply free in 1 minute.' ),
		'urgent-hiring-jobs' => array( 'Urgent Hiring Jobs' . $in . ' – Start Immediately', 'Employers hiring urgently' . $in . '. Jobs with immediate start, many hiring this week. Apply free in 1 minute.' ),
		'new-jobs-this-week' => array( 'New Jobs This Week' . $in, 'Every job posted' . $in . ' in the last 7 days. Be one of the first to apply.' ),
		'student-jobs'       => array( ( $in_in ? 'Internships & Student Jobs' : 'Student Jobs' ) . $in, 'Student, internship, co-op, summer, evening and weekend jobs' . $in . '. Apply free in 1 minute.' ),
	);
}
function jr22_seo_for_page() {
	if ( ! is_page() ) return null;
	$slug = get_post_field( 'post_name', get_queried_object_id() );
	$m    = jr22_seo();
	return $m[ $slug ] ?? null;
}
add_filter( 'rank_math/frontend/title', function ( $t ) { $s = jr22_seo_for_page(); return $s && empty( $_GET['pg'] ) ? $s[0] . ' | ' . get_bloginfo( 'name' ) : $t; }, 99 );
add_filter( 'rank_math/frontend/description', function ( $d ) { $s = jr22_seo_for_page(); return $s ? $s[1] : $d; }, 99 );
add_filter( 'rank_math/opengraph/facebook/og_title', function ( $t ) { $s = jr22_seo_for_page(); return $s ? $s[0] : $t; }, 99 );
add_filter( 'rank_math/opengraph/facebook/og_description', function ( $d ) { $s = jr22_seo_for_page(); return $s ? $s[1] : $d; }, 99 );
add_filter( 'pre_get_document_title', function ( $t ) { $s = jr22_seo_for_page(); return $s && ! defined( 'RANK_MATH_VERSION' ) ? $s[0] . ' | ' . get_bloginfo( 'name' ) : $t; }, 99 );

/* FAQ on the resume builder and pay checker (visible text + FAQPage schema) */
function jr22_faq() {
	if ( ! is_page( array( 'resume-builder', 'pay-checker' ) ) ) return array();
	$place = jr22_place() ?: 'your country';
	$price = jr22_price();
	if ( is_page( 'resume-builder' ) ) return array(
		array( 'How does the AI resume builder work?', 'Type your work history in your own words, or upload your old resume. Choose the job you want. The AI writes a clean, professional resume in the format employers in ' . $place . ' expect, and you download it as a PDF.' ),
		array( 'How much does it cost?', $price ? 'One payment of ' . $price . ' lets you make up to 3 versions within 7 days and download them as PDFs. It is free in the JobsRack app.' : 'It is free.' ),
		array( 'Will the AI make things up?', 'No. It only uses the facts you give it: your jobs, dates, studies and skills. It rewrites them so they read professionally. Always check your resume before you send it.' ),
		array( 'Is the resume ATS-friendly?', 'Yes. It uses a simple one-column layout with standard headings (Summary, Skills, Work experience, Education) that applicant tracking systems can read.' ),
		array( 'Should my resume include a photo or my age?', 'In ' . $place . ', no. Leave out your photo, date of birth, age, marital status and religion. The builder leaves these out for you.' ),
	);
	return array(
		array( 'How does the pay checker work?', 'We compare the pay you enter with the pay in real job ads on JobsRack for the same job title, and in your city when there are enough ads.' ),
		array( 'Is my information saved?', 'No. Nothing you enter in the pay checker is stored.' ),
		array( 'What should I do if I am underpaid?', 'Look at the better-paying jobs listed under your result, update your resume, and use the typical pay as a guide when you ask for a raise or negotiate an offer.' ),
	);
}
add_filter( 'do_shortcode_tag', function ( $c, $tag ) {
	if ( ! in_array( $tag, array( 'jr_resume_writer', 'jr_pay_checker' ), true ) ) return $c;
	$f = jr22_faq();
	if ( ! $f ) return $c;
	$h = '<div class="jr22-faq" style="max-width:760px;margin:30px auto 0"><h2 style="font-size:22px">Frequently asked questions</h2>';
	foreach ( $f as $q ) $h .= '<details style="border:1px solid #e4e7ec;border-radius:10px;padding:12px 14px;margin:0 0 8px;background:#fff"><summary style="font-weight:700;cursor:pointer">' . esc_html( $q[0] ) . '</summary><p style="margin:8px 0 0">' . esc_html( $q[1] ) . '</p></details>';
	return $c . $h . '</div>';
}, 10, 2 );
add_action( 'wp_head', function () {
	$f = jr22_faq();
	if ( $f ) {
		$s = array( '@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map( function ( $q ) { return array( '@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $q[1] ) ); }, $f ) );
		echo '<script type="application/ld+json">' . wp_json_encode( $s ) . '</script>' . "\n";
	}
	if ( is_page( 'resume-builder' ) ) {
		$app = array( '@context' => 'https://schema.org', '@type' => 'WebApplication', 'name' => 'JobsRack AI Resume Builder', 'url' => home_url( '/resume-builder/' ), 'applicationCategory' => 'BusinessApplication', 'operatingSystem' => 'Web, Android', 'description' => jr22_seo()['resume-builder'][1] );
		if ( function_exists( 'jr20_price' ) && function_exists( 'jr20_paid' ) && jr20_paid() ) $app['offers'] = array( '@type' => 'Offer', 'price' => (string) jr20_price(), 'priceCurrency' => strtoupper( jr20_currency() ) );
		echo '<script type="application/ld+json">' . wp_json_encode( $app ) . '</script>' . "\n";
	}
	// Collection pages: list of jobs on the page
	if ( is_page() && function_exists( 'jr21_collection_jobs' ) && has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'jr_collection' ) && preg_match( '/k="([a-z]+)"/', (string) get_post_field( 'post_content', get_queried_object_id() ), $m ) ) {
		$jobs = array_slice( jr21_collection_jobs( $m[1] ), 0, 30 );
		if ( $jobs ) {
			$s = array( '@context' => 'https://schema.org', '@type' => 'ItemList', 'itemListElement' => array() );
			foreach ( $jobs as $i => $j ) $s['itemListElement'][] = array( '@type' => 'ListItem', 'position' => $i + 1, 'url' => get_permalink( $j['id'] ) );
			echo '<script type="application/ld+json">' . wp_json_encode( $s ) . '</script>' . "\n";
		}
	}
}, 30 );

/* Popular searches: internal links above the footer on every page */
add_action( 'wp_footer', function () {
	if ( is_admin() ) return;
	$links = array();
	foreach ( jr22_seo() as $slug => $x ) if ( get_page_by_path( $slug ) ) $links[] = '<a href="' . esc_url( home_url( '/' . $slug . '/' ) ) . '">' . esc_html( preg_replace( '/\s*[–:].*$/u', '', $x[0] ) ) . '</a>';
	foreach ( array( '/salaries/' => 'Salaries', '/companies/' => 'Companies' ) as $u => $l ) $links[] = '<a href="' . esc_url( home_url( $u ) ) . '">' . $l . '</a>';
	if ( ! $links ) return;
	echo '<div id="jr22-pop" style="display:none"><div style="max-width:1170px;margin:0 auto;padding:16px 15px;font-size:14px;line-height:2"><b style="margin-right:8px">Popular:</b>' . implode( ' <span style="color:#98a2b3">·</span> ', $links ) . '</div></div>';
	echo '<script>(function(){var p=document.getElementById("jr22-pop"),f=document.querySelector("footer");if(p&&f){p.style.display="";p.style.background="#f9fafb";p.style.borderTop="1px solid #eaecf0";f.parentNode.insertBefore(p,f)}})();</script>';
}, 60 );

/* Clear the page cache once after this snippet is installed or updated, so the new menu and banners show. */
add_action( 'init', function () {
	$v = 'p4';
	if ( get_option( 'jr22_cache_v' ) === $v ) return;
	update_option( 'jr22_cache_v', $v, false );
	if ( isset( $GLOBALS['wp_fastest_cache'] ) && method_exists( $GLOBALS['wp_fastest_cache'], 'deleteCache' ) ) $GLOBALS['wp_fastest_cache']->deleteCache( true );
}, 99 );
