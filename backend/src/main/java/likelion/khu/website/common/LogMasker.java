package likelion.khu.website.common;

// 로그 파일이 서버에 평문으로 최대 30일 보관되기 때문에(infra/scripts/cleanup-old-logs.sh),
// 로그에 남기는 개인정보는 원문 대신 이 유틸로 가려서 남긴다.
public final class LogMasker {

    private LogMasker() {
    }

    public static String maskEmail(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String visible = email.substring(0, Math.min(2, at));
        return visible + "***" + email.substring(at);
    }

    public static String maskId(String id) {
        if (id == null) {
            return null;
        }
        String visible = id.substring(0, Math.min(2, id.length()));
        return visible + "***";
    }
}
