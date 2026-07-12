use super::*;
use crate::registry_admin_journal::ShardJournal;

#[test]
fn admin_close_recovery_rotation_and_gc_preserve_signed_history() {
    let root = std::env::temp_dir().join(format!("ty-context-admin-test-{}", uuid::Uuid::new_v4()));
    let mut admin = AdminRegistry::open(&root).unwrap();
    let shard = root.join("repositories/shard-a");
    let active=admin.keys.sign_object(&json!({"schema_version":"ty-context-host-active-registry-v1","registry_id":"registry-a","state":"sealed","repository_identity_hash":"repo-a","workdir_identity_hash":"work-a","contract_sha256":"contract-a"})).unwrap();
    let content = canonical_string(&active).unwrap();
    ShardJournal::new(&shard, &admin.keys)
        .commit(
            "seal",
            vec![
                AdminWrite {
                    path: "registry/active/records/registry-a.json".into(),
                    content: Some(content.clone()),
                },
                AdminWrite {
                    path: "registry/active/by-repository/repo-a.json".into(),
                    content: Some(content.clone()),
                },
                AdminWrite {
                    path: "registry/active/by-workdir/work-a.json".into(),
                    content: Some(content),
                },
            ],
        )
        .unwrap();
    let journal = fs::read_dir(shard.join("journal"))
        .unwrap()
        .filter_map(Result::ok)
        .find(|entry| entry.path().is_file())
        .unwrap();
    let transaction: Value = serde_json::from_slice(&fs::read(journal.path()).unwrap()).unwrap();
    fs::remove_file(shard.join("journal/applied").join(format!(
        "{}.json",
        field(&transaction, "transaction_id").unwrap()
    )))
    .unwrap();
    assert_eq!(
        admin.recover_journal("registry-a").unwrap()["journal_records"],
        1
    );
    let tombstone = admin
        .close("registry-a", "operator requested closure")
        .unwrap();
    assert_eq!(
        tombstone["schema_version"],
        "ty-context-host-administrative-tombstone-v1"
    );
    assert!(
        !shard
            .join("registry/active/records/registry-a.json")
            .exists()
    );
    let old = admin.keys.key_id.clone();
    let public = root.join("managed/host-service-public.pem");
    let rotation = admin.rotate_key("registry-a", &public).unwrap();
    assert_eq!(rotation["old_key_id"], old);
    assert_ne!(rotation["new_key_id"], old);
    admin.keys.verify_object(&tombstone).unwrap();
    let reservation=admin.keys.sign_object(&json!({"schema_version":"ty-context-host-authority-reservation-v1","reservation_id":"reservation-a","repository_identity_hash":"repo-expired","workdir_identity_hash":"work-expired","expires_at_unix_ms":0})).unwrap();
    let reservation_content = canonical_string(&reservation).unwrap();
    ShardJournal::new(&shard, &admin.keys)
        .commit(
            "reserve",
            vec![
                AdminWrite {
                    path: "registry/reservations/by-repository/repo-expired.json".into(),
                    content: Some(reservation_content.clone()),
                },
                AdminWrite {
                    path: "registry/reservations/by-workdir/work-expired.json".into(),
                    content: Some(reservation_content),
                },
            ],
        )
        .unwrap();
    let gc = admin.gc("registry-a").unwrap();
    assert_eq!(gc["expired_reservations"], 1);
    assert!(
        !shard
            .join("registry/reservations/by-repository/repo-expired.json")
            .exists()
    );
    assert!(admin.keys.retained_key_ids().unwrap().contains(&old));
    assert_eq!(admin.status().unwrap()["tombstones"], 1);
    fs::remove_dir_all(root).unwrap();
}
