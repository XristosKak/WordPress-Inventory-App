=== Inventory App ===
Contributors: General Theme
Requires at least: 5.6
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv3 or later

Εφαρμογή αποθέματος με shortcode και σελίδα στο admin. Ίδια λειτουργικότητα με το theme (κατηγορία, μάρκα, πολλαπλές φωτογραφίες, CSV, PDF, στατιστικά).

== Εγκατάσταση ==
1. Ενεργοποίηση του plugin από τα Plugins.
2. Για εμφάνιση στο front: σε οποιαδήποτε σελίδα ή post πρόσθεσε το shortcode [inventory_app].
3. Στο admin εμφανίζεται στο μενού «Απόθεμα» (dashicons-portfolio).

== Shortcode ==
[inventory_app]

Εμφανίζει την πλήρη εφαρμογή αποθέματος (λίστα προϊόντων, φίλτρα, νέο προϊόν, ετικέτες, κατηγορίες, εξαγωγή CSV/JSON, στατιστικά).

== Απαιτήσεις ==
Για αποθήκευση στη βάση ο χρήστης πρέπει να είναι συνδεδεμένος (edit_posts). Τα δεδομένα αποθηκεύονται στο CPT inv_product και στα options για tags/categories.
